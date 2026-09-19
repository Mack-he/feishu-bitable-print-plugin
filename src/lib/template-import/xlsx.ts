// 服务端专用：把 Excel(.xlsx) 模板转换为排版画布组件
//
// 用 exceljs 读取工作簿：把第一个有内容的表格转为 canvas 表格组件，
// - 合并单元格 → rowSpan/colSpan（被覆盖的格子用 rowSpan:0/colSpan:0 占位，与编辑器约定一致）
// - 整行空白 → 分隔成多个表格组件
// - 单元格字体/加粗/颜色/背景/对齐 → 单元格样式
// - 工作表内的图片 → image 组件（顶部图片放表格前，其余放表格后）
// 变量占位符（[字段名] / {{字段名}}）统一成 [字段名]。
//
// 注意：本文件只能在 Node 运行时（API Route）中使用，不要被客户端组件引用。

// exceljs 是 CommonJS 包，默认导入在 Next 打包与 Node 直跑下都最稳定
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '@/lib/ai/template-spec';
import type { PageConfig } from '@/types/editor';

// 导入上限
const MAX_TABLE_ROWS = 300;
const MAX_TABLE_COLS = 30;
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_CELL_CHARS = 500;
// A4 纵向正文可用宽度约 (210-20*2)mm × 3.78px/mm = 642.6px，超出则转横向
const PORTRAIT_CONTENT_WIDTH = 640;

export interface XlsxConvertResult {
  components: any[];
  warnings: string[];
  sheetName: string;
  pageConfig: Partial<PageConfig>;
}

function columnsToNumber(address: string): number {
  let col = 0;
  for (const ch of address.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') break;
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return col;
}

// ARGB(FFRRGGBB) → #RRGGBB；白色/无效值返回 null
function argbToCss(argb: unknown): string | null {
  if (typeof argb !== 'string') return null;
  const hex = argb.replace(/^#/, '');
  if (/^[0-9a-f]{8}$/i.test(hex)) return `#${hex.slice(2).toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toUpperCase()}`;
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function convertXlsxToComponents(buffer: Buffer): Promise<XlsxConvertResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as any);
  } catch (error) {
    console.error('[Template Import] exceljs 解析 xlsx 失败:', error);
    throw new Error('无法解析 Excel 文件：文件可能损坏，或不是 .xlsx 格式（旧版 .xls 请先另存为 .xlsx）');
  }

  const warnings: string[] = [];
  const worksheets = workbook.worksheets;
  if (!worksheets.length) throw new Error('Excel 文件中没有任何工作表');

  if (worksheets.length > 1) {
    warnings.push(`文件包含 ${worksheets.length} 个工作表，仅导入了第一个：${worksheets[0].name}`);
  }

  const ws: any = worksheets[0];
  const sheetName = ws?.name || 'Sheet1';

  // ========== 确定使用范围 ==========
  let dim: any = ws.dimensions;
  if (!dim || !readNumber(dim?.bottom ?? dim?.model?.bottom, 0)) {
    // dimensions 缺失时扫描行数据推断
    let maxRow = 0;
    let maxCol = 0;
    (ws.eachRow as Function).call(ws, (row: any, rowNumber: number) => {
      if (!row?.hasValues) return;
      maxRow = Math.max(maxRow, rowNumber);
      (row.eachCell as Function).call(row, (cell: any, colNumber: number) => {
        if (cell && cell.value !== null && cell.value !== undefined && String(cell.value) !== '') {
          maxCol = Math.max(maxCol, colNumber);
        }
      });
    });
    dim = { top: 1, left: 1, bottom: maxRow, right: maxCol };
  }

  const top = Math.max(1, readNumber(dim?.top ?? dim?.model?.top, 1));
  const left = Math.max(1, readNumber(dim?.left ?? dim?.model?.left, 1));
  let bottom = readNumber(dim?.bottom ?? dim?.model?.bottom, 0);
  let right = readNumber(dim?.right ?? dim?.model?.right, 0);

  if (!bottom || !right || bottom < top || right < left) {
    throw new Error('工作表中没有可导入的内容');
  }
  if (bottom - top + 1 > MAX_TABLE_ROWS) {
    warnings.push(`工作表共 ${bottom - top + 1} 行，超过 ${MAX_TABLE_ROWS} 行的部分已忽略`);
    bottom = top + MAX_TABLE_ROWS - 1;
  }
  if (right - left + 1 > MAX_TABLE_COLS) {
    warnings.push(`工作表共 ${right - left + 1} 列，超过 ${MAX_TABLE_COLS} 列的部分已忽略`);
    right = left + MAX_TABLE_COLS - 1;
  }

  // ========== 合并单元格 ==========
  const mergeAt = new Map<string, { rowSpan: number; colSpan: number }>();
  const covered = new Set<string>();
  const rawMerges: unknown = ws?.model?.merges;
  if (Array.isArray(rawMerges)) {
    for (const merge of rawMerges) {
      if (typeof merge !== 'string') continue;
      const match = merge.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
      if (!match) continue;
      const c1 = columnsToNumber(match[1]);
      const r1 = Number(match[2]);
      const c2 = columnsToNumber(match[3]);
      const r2 = Number(match[4]);
      if (r1 < top || c1 < left || r1 > bottom || c1 > right) continue;
      const rowSpan = Math.min(r2, bottom) - r1 + 1;
      const colSpan = Math.min(c2, right) - c1 + 1;
      if (rowSpan <= 1 && colSpan <= 1) continue;
      mergeAt.set(`${r1},${c1}`, { rowSpan, colSpan });
      for (let r = r1; r <= Math.min(r2, bottom); r++) {
        for (let c = c1; c <= Math.min(c2, right); c++) {
          if (r !== r1 || c !== c1) covered.add(`${r},${c}`);
        }
      }
    }
  }

  // ========== 读格子 ==========
  const grid: any[][] = [];
  for (let r = top; r <= bottom; r++) {
    const gridRow: any[] = [];
    for (let c = left; c <= right; c++) {
      const key = `${r},${c}`;
      if (covered.has(key)) {
        gridRow.push({ id: `c-${r}-${c}`, content: '', rowSpan: 0, colSpan: 0, style: { fontSize: 13 } });
        continue;
      }
      const cell: any = ws.getCell(r, c);
      const content = sanitizeText(String(cell?.text ?? ''), MAX_CELL_CHARS);

      const style: Record<string, unknown> = { fontSize: 13 };
      const font: any = cell?.font || {};
      if (typeof font.size === 'number' && Number.isFinite(font.size)) {
        style.fontSize = clamp(Math.round(font.size), 8, 40);
      }
      if (font.bold) style.bold = true;
      if (font.italic) style.italic = true;
      const fontColor = argbToCss(font?.color?.argb);
      if (fontColor) style.color = fontColor;
      const fillColor = argbToCss(cell?.fill?.fgColor?.argb);
      if (fillColor && fillColor !== '#FFFFFF') style.backgroundColor = fillColor;

      const alignment: any = cell?.alignment || {};
      if (alignment.horizontal === 'center' || alignment.horizontal === 'right') {
        style.align = alignment.horizontal;
      } else if (alignment.horizontal === 'justify') {
        style.align = 'justify';
      } else {
        style.align = 'left';
      }
      if (alignment.vertical === 'middle' || alignment.vertical === 'center') style.verticalAlign = 'middle';
      else if (alignment.vertical === 'top') style.verticalAlign = 'top';
      else if (alignment.vertical === 'bottom') style.verticalAlign = 'bottom';

      const merge = mergeAt.get(key);
      gridRow.push({
        id: `c-${r}-${c}`,
        content,
        rowSpan: merge ? merge.rowSpan : 1,
        colSpan: merge ? merge.colSpan : 1,
        style,
      });
    }
    grid.push(gridRow);
  }

  // ========== 按整行空白拆分表格块 ==========
  const blocks: any[][][] = [];
  let current: any[][] | null = null;
  for (const gridRow of grid) {
    const hasOwnCells = gridRow.some((cell) => cell.rowSpan !== 0 || cell.colSpan !== 0);
    const hasContent = gridRow.some((cell) => (cell.rowSpan !== 0 || cell.colSpan !== 0) && cell.content);
    if (!hasOwnCells) {
      // 整行都被合并单元格覆盖时视为上一块的延续
      current?.push(gridRow);
      continue;
    }
    if (!hasContent) {
      if (current) {
        blocks.push(current);
        current = null;
      }
      continue;
    }
    if (!current) current = [];
    current.push(gridRow);
  }
  if (current) blocks.push(current);

  const tables = blocks.map((block) => ({
    id: uuidv4(),
    type: 'table',
    tableConfig: {
      cells: block,
      colWidths: [],
      headerRows: 0,
      footerRows: 0,
      borderWidth: 1,
      borderColor: '#000000',
      showOuterBorder: true,
      showInnerBorder: true,
    },
  }));

  if (tables.length === 0) {
    throw new Error('工作表中没有可导入的内容');
  }

  // ========== 列宽（用于纸张方向判断） ==========
  const colWidths: number[] = [];
  for (let c = left; c <= right; c++) {
    const col: any = ws.getColumn(c);
    const width = typeof col?.width === 'number' && col.width > 0 ? col.width : null;
    colWidths.push(width !== null ? clamp(Math.round(width * 7.5 + 5), 20, 800) : 90);
  }
  const contentWidth = colWidths.reduce((sum, width) => sum + width, 0);
  if (contentWidth > PORTRAIT_CONTENT_WIDTH) {
    warnings.push('表格宽度超过 A4 纵向版心，已自动切换为横向纸张');
  }

  // ========== 工作表内嵌图片 ==========
  const topImages: any[] = [];
  const bottomImages: any[] = [];
  try {
    if (typeof ws.getImages === 'function') {
      const images: any[] = ws.getImages() || [];
      if (images.length > MAX_IMAGES) {
        warnings.push(`工作表包含 ${images.length} 张图片，仅导入前 ${MAX_IMAGES} 张`);
      }
      for (const img of images.slice(0, MAX_IMAGES)) {
        try {
          const media: any = workbook.getImage(img.imageId);
          if (!media?.buffer || !media?.extension) continue;
          const ext = String(media.extension).toLowerCase().replace(/^\./, '');
          const mime = ext === 'jpg' ? 'jpeg' : ext;
          if (!['png', 'jpeg', 'gif', 'bmp', 'webp'].includes(mime)) continue;
          if (media.buffer.length > MAX_IMAGE_BYTES) {
            warnings.push(`图片「${media.name || ''}」超过 2MB 已跳过`);
            continue;
          }
          const node = {
            id: uuidv4(),
            type: 'image',
            src: `data:image/${mime};base64,${(media.buffer as Buffer).toString('base64')}`,
            alt: media.name || 'Excel 图片',
            fit: 'contain',
            minHeight: 100,
          };
          const anchor: any = img.range?.tl;
          const rowPosition = Number(anchor?.nativeRow ?? anchor?.row ?? 0);
          if (rowPosition <= 1) topImages.push(node);
          else bottomImages.push(node);
        } catch {
          // 单张图片解析失败不阻断整体导入
        }
      }
    }
  } catch {
    // getImages 不可用时跳过图片
  }

  const components = [...topImages, ...tables, ...bottomImages];

  return {
    components,
    warnings,
    sheetName,
    pageConfig: {
      orientation: contentWidth > PORTRAIT_CONTENT_WIDTH ? 'landscape' : 'portrait',
    },
  };
}