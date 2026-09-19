// 服务端专用：把 Word(.docx) 模板转换为排版画布组件
//
// 通过 mammoth 的 transformDocument 钩子拿到解析后的文档 AST 直接转换：
// - 标题（heading 1-6 / 标题 1-6 样式）→ heading
// - 段落（含首行缩进、对齐、整段加粗/斜体/下划线、字号）→ text / paragraph
// - 编号/项目符号 → list
// - 表格（AST 直接给出 colSpan/rowSpan）→ table
// - 内嵌图片 → image（base64 dataURL）
// Word 中的变量占位符（[字段名] / {{字段名}}）统一成 [字段名]。
//
// 注意：本文件只能在 Node 运行时（API Route）中使用，不要被客户端组件引用。

import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '@/lib/ai/template-spec';

// 导入上限，防止极端文件拖垮编辑器
export const MAX_COMPONENTS = 150;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_COLS = 20;
const MAX_LIST_ITEMS = 50;
const MAX_CELL_CHARS = 500;

export interface DocxConvertResult {
  components: any[];
  warnings: string[];
  imageCount: number;
  tableCount: number;
}

interface WalkContext {
  components: any[];
  warnings: string[];
  imageCount: number;
  tableCount: number;
  // 连续编号段落缓存，遇到普通块时合并成 list 组件
  listBuffer: { isOrdered: boolean; items: string[] }[];
}

type AlignValue = 'left' | 'center' | 'right' | 'justify';

const HEADING_STYLE_SIZES: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 13 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Word 字号（磅）→ 编辑器 px（96dpi 换算，10.5pt ≈ 14px，与预置模板一致）
function pointsToPx(points: number): number {
  return clamp(Math.round(points * (4 / 3)), 8, 72);
}

function normalizeAlign(alignment: unknown, fallback: AlignValue): AlignValue {
  const value = String(alignment ?? '').toLowerCase();
  if (value === 'center' || value === 'right' || value === 'left') return value;
  if (value === 'both' || value === 'justify' || value === 'distribute') return 'justify';
  return fallback;
}

// 提取段落文本：run 内联图片单独处理，换行保留，制表符转空格
function paragraphTextAndImages(children: any[]): { text: string; images: { src: string; alt: string }[] } {
  let text = '';
  const images: { src: string; alt: string }[] = [];

  const walk = (node: any) => {
    if (node == null) return;
    const type = node.type;
    if (type === 'text') {
      text += String(node.value ?? '');
    } else if (type === 'line-break' || type === 'lineBreak' || (type && String(type).includes('break'))) {
      text += '\n';
    } else if (type === 'tab') {
      text += ' ';
    } else if (type === 'image') {
      if (typeof node.read === 'function' || typeof node.readAsArrayBuffer === 'function') {
        images.push({ src: node, alt: node.altText || '文档图片' });
      }
    } else {
      for (const child of node.children || []) walk(child);
    }
  };
  for (const child of children) walk(child);
  return { text, images };
}

// 读取 AST 内嵌图片为 dataURL
async function imageToDataUrl(image: any): Promise<string | null> {
  try {
    if (typeof image.read === 'function') {
      const encoded: string = await image.read('base64');
      if (encoded && image.contentType) return `data:${image.contentType};base64,${encoded}`;
    }
    if (typeof image.readAsArrayBuffer === 'function') {
      const arrayBuffer: ArrayBuffer = await image.readAsArrayBuffer();
      const contentType = image.contentType || 'image/png';
      return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }
    return null;
  } catch {
    return null;
  }
}

function headingLevelOf(styleName: unknown): number | null {
  const name = String(styleName ?? '');
  const english = name.match(/^heading\s*([1-6])$/i);
  if (english) return Number(english[1]);
  const chinese = name.match(/^标题\s*([1-6])$/);
  if (chinese) return Number(chinese[1]);
  return null;
}

function isHorizontalRuleStyle(styleName: unknown): boolean {
  const name = String(styleName ?? '').toLowerCase();
  return name === 'horizontal rule' || name === 'horizontalrule' || name === 'hr';
}

interface RunFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSizePx: number | null;
}

// 段落主格式：全部文本 run 都加粗才算整段加粗，字号取第一个有显式字号的 run
function dominantRunFormat(children: any[]): RunFormat {
  let bold = false;
  let italic = false;
  let underline = false;
  let fontSizePx: number | null = null;
  let textRunCount = 0;
  let boldRunCount = 0;
  let italicRunCount = 0;
  let underlineRunCount = 0;

  const walk = (node: any) => {
    if (node == null) return;
    if (node.type === 'run') {
      const hasText = (node.children || []).some((child: any) => child?.type === 'text' && String(child.value ?? ''));
      if (!hasText) return;
      textRunCount += 1;
      if (node.isBold) boldRunCount += 1;
      if (node.isItalic) italicRunCount += 1;
      if (node.isUnderline) underlineRunCount += 1;
      if (fontSizePx === null && typeof node.fontSize === 'number' && node.fontSize > 0) {
        fontSizePx = pointsToPx(node.fontSize);
      }
    } else if (node.type !== 'text') {
      for (const child of node.children || []) walk(child);
    }
  };
  for (const child of children) walk(child);

  if (textRunCount > 0) {
    bold = boldRunCount === textRunCount;
    italic = italicRunCount === textRunCount;
    underline = underlineRunCount === textRunCount;
  }
  return { bold, italic, underline, fontSizePx };
}

function makeTextNode(
  content: string,
  format: { bold: boolean; italic: boolean; underline: boolean; align: AlignValue; fontSizePx?: number | null },
  indentChars = 0
): any | null {
  const cleaned = sanitizeText(content);
  if (!cleaned) return null;

  const type = indentChars > 0 ? 'paragraph' : 'text';
  const textStyle: Record<string, unknown> = {
    fontSize: format.fontSizePx ?? 14,
    color: '#333333',
    bold: format.bold,
    align: format.align,
    lineHeight: 1.5,
    paragraphSpacing: 4,
  };
  if (format.italic) textStyle.italic = true;
  if (format.underline) textStyle.underline = true;

  const node: any = { id: uuidv4(), type, content: cleaned, textStyle };
  if (type === 'paragraph') {
    node.indent = clamp(indentChars, 0, 8);
  }
  return node;
}

function makeImageNode(src: string, alt: string): any {
  return { id: uuidv4(), type: 'image', src, alt: alt || '文档图片', fit: 'contain', minHeight: 120 };
}

function makeLineNode(): any {
  return { id: uuidv4(), type: 'line', color: '#000000', thickness: 1, style: 'solid' };
}

function flushListBuffer(ctx: WalkContext): void {
  for (const group of ctx.listBuffer) {
    if (group.items.length === 0) continue;
    const items = group.items.slice(0, MAX_LIST_ITEMS);
    if (group.items.length > MAX_LIST_ITEMS) {
      ctx.warnings.push(`一个列表超过 ${MAX_LIST_ITEMS} 项，多余项已忽略`);
    }
    ctx.components.push({
      id: uuidv4(),
      type: 'list',
      items,
      listType: group.isOrdered ? 'ordered' : 'unordered',
      textStyle: { fontSize: 14, color: '#333333', lineHeight: 1.6, paragraphSpacing: 4 },
    });
  }
  ctx.listBuffer = [];
}

// 表格内的方框字符（□ ☐ ☑ ☒）保持为单元格文本，由渲染层统一画成打勾方框；
// 独立段落的纯方框则转成 checkbox 组件。
function extractCheckboxStyle(content: string): { checked: boolean } | null {
  const hasBox = /[□☐☑☒]/.test(content);
  if (!hasBox) return null;
  if (content.replace(/[□☐☑☒\s]/g, '').length > 0) return null; // 混排文本保持文本
  return { checked: /[☑☒]/.test(content) };
}

async function processParagraph(paragraph: any, ctx: WalkContext): Promise<void> {
  const children: any[] = paragraph.children || [];
  const { text, images } = paragraphTextAndImages(children);

  // 分隔线样式
  if (isHorizontalRuleStyle(paragraph.styleName)) {
    ctx.components.push(makeLineNode());
    return;
  }

  // 编号段落先进缓存，由 flushListBuffer 合并成列表
  if (paragraph.numbering) {
    const cleaned = sanitizeText(text, MAX_CELL_CHARS);
    if (cleaned) {
      const isOrdered = Boolean(paragraph.numbering.isOrdered);
      const last = ctx.listBuffer[ctx.listBuffer.length - 1];
      if (last && last.isOrdered === isOrdered) {
        last.items.push(cleaned);
      } else {
        ctx.listBuffer.push({ isOrdered, items: [cleaned] });
      }
    }
    return;
  }

  const format = dominantRunFormat(children);
  const align = normalizeAlign(paragraph.alignment, 'left');
  const firstLineIndent = Number(paragraph.indent?.firstLine) || 0;

  // 独立的纯方框段落（如单独一行的「□」）→ checkbox 组件，可在编辑器里独立调整大小
  const checkboxStyle = headingLevelOf(paragraph.styleName) === null && images.length === 0 ? extractCheckboxStyle(sanitizeText(text)) : null;
  if (checkboxStyle) {
    ctx.components.push({
      id: uuidv4(),
      type: 'checkbox',
      width: 100,
      layout: { width: '100%' },
      size: 24,
      checked: checkboxStyle.checked,
      borderColor: '#000000',
      borderWidth: 1.5,
      align,
    });
    return;
  }

  // 图片段落：按 AST 内文本/图片顺序拆分为多个组件；转 dataURL 是异步的，逐张处理
  if (images.length > 0) {
    // 先按出现顺序拆分：遍历顶层节点，文本节点累积、图片节点切分
    let pending = '';
    const flushText = () => {
      if (!pending.trim()) return;
      // 图片段落里的文本通常不是整段格式，按普通文本处理
      const node = makeTextNode(pending, { bold: false, italic: false, underline: false, align });
      if (node) ctx.components.push(node);
      pending = '';
    };
    const walkSplit = async (node: any): Promise<void> => {
      if (node == null) return;
      if (node.type === 'image') {
        flushText();
        const src = await imageToDataUrl(node);
        if (src) {
          ctx.components.push(makeImageNode(src, node.altText || '文档图片'));
          ctx.imageCount += 1;
        }
        return;
      }
      if (node.type === 'text') {
        pending += String(node.value ?? '');
        return;
      }
      if (node.type === 'tab') {
        pending += ' ';
        return;
      }
      if (node.type === 'line-break' || (node.type && String(node.type).includes('break'))) {
        pending += '\n';
        return;
      }
      for (const child of node.children || []) await walkSplit(child);
    };
    for (const child of children) await walkSplit(child);
    flushText();
    return;
  }

  // 标题
  const headingLevel = headingLevelOf(paragraph.styleName);
  if (headingLevel !== null) {
    const content = sanitizeText(text);
    if (!content) return;
    ctx.components.push({
      id: uuidv4(),
      type: 'heading',
      level: headingLevel,
      content,
      textStyle: {
        fontSize: format.fontSizePx ?? HEADING_STYLE_SIZES[headingLevel] ?? 18,
        color: '#000000',
        bold: format.bold,
        align: normalizeAlign(paragraph.alignment, headingLevel <= 2 ? 'center' : 'left'),
        paragraphSpacing: 10,
      },
    });
    return;
  }

  // 普通段落：按首行缩进换算字符数（240 twips ≈ 一个字），决定 text / paragraph 类型
  const indentChars = firstLineIndent > 0 ? clamp(Math.max(1, Math.round(firstLineIndent / 240)), 1, 8) : 0;
  const node = makeTextNode(text, { ...format, align }, indentChars);
  if (node) {
    ctx.components.push(node);
  }
}

async function processTable(table: any, ctx: WalkContext): Promise<void> {
  const rowNodes: any[] = table.children || [];
  const rows = rowNodes.slice(0, MAX_TABLE_ROWS);
  if (rows.length === 0) return;
  if (rowNodes.length > MAX_TABLE_ROWS) {
    ctx.warnings.push(`一个表格超过 ${MAX_TABLE_ROWS} 行，多余行已忽略`);
  }

  // occupied[r][c] = 该位置被上方/左侧的合并单元格覆盖
  const occupied: boolean[][] = [];
  const raw: (any | undefined)[][] = [];

  for (let r = 0; r < rows.length; r++) {
    occupied[r] = occupied[r] || [];
    raw[r] = raw[r] || [];
    const cellNodes: any[] = (rows[r].children || []).filter((node: any) => node?.type === 'tableCell');
    let c = 0;
    for (const cell of cellNodes) {
      while (occupied[r][c]) c += 1;
      if (c >= MAX_TABLE_COLS) break;
      const colSpan = clamp(Number(cell.colSpan) || 1, 1, MAX_TABLE_COLS - c);
      const rowSpan = clamp(Number(cell.rowSpan) || 1, 1, MAX_TABLE_ROWS - r);

      // 单元格内容：多个段落用换行连接；样式取第一个段落的格式与对齐
      const paragraphs = (cell.children || []).filter((node: any) => node?.type === 'paragraph');
      const parts: string[] = [];
      for (const paragraph of paragraphs) {
        const { text } = paragraphTextAndImages(paragraph.children || []);
        const cleaned = sanitizeText(text, MAX_CELL_CHARS);
        if (cleaned) parts.push(cleaned);
      }
      const content = parts.join('\n');

      const firstParagraph = paragraphs[0];
      const firstFormat = firstParagraph ? dominantRunFormat(firstParagraph.children || []) : { bold: false, fontSizePx: null };
      const firstAlign = firstParagraph ? normalizeAlign(firstParagraph.alignment, 'left') : 'left';
      const fontSizePx = firstFormat.fontSizePx ?? 14;

      const style: Record<string, unknown> = { fontSize: fontSizePx };
      if (firstFormat.bold) style.bold = true;
      if (firstAlign !== 'left') style.align = firstAlign;

      raw[r][c] = { content, style, rowSpan, colSpan };

      for (let i = 0; i < rowSpan; i++) {
        for (let j = 0; j < colSpan; j++) {
          if (i !== 0 || j !== 0) {
            occupied[r + i] = occupied[r + i] || [];
            occupied[r + i][c + j] = true;
          }
        }
      }
      c += colSpan;
    }
  }

  let maxCols = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < MAX_TABLE_COLS; c++) {
      if (raw[r]?.[c] !== undefined || occupied[r]?.[c]) maxCols = Math.max(maxCols, c + 1);
    }
  }
  if (maxCols === 0) return;

  // 矩形网格：被合并覆盖的位置用 rowSpan:0 / colSpan:0 占位（编辑器合并约定）
  const cells: any[][] = [];
  for (let r = 0; r < rows.length; r++) {
    const row: any[] = [];
    for (let c = 0; c < maxCols; c++) {
      if (occupied[r]?.[c]) {
        row.push({ id: uuidv4(), content: '', rowSpan: 0, colSpan: 0, style: { fontSize: 14 } });
      } else if (raw[r]?.[c]) {
        row.push({ id: uuidv4(), ...raw[r][c] });
      } else {
        row.push({ id: uuidv4(), content: '', rowSpan: 1, colSpan: 1, style: { fontSize: 14 } });
      }
    }
    cells.push(row);
  }

  ctx.tableCount += 1;
  ctx.components.push({
    id: uuidv4(),
    type: 'table',
    tableConfig: {
      cells,
      colWidths: [],
      headerRows: 0,
      footerRows: 0,
      borderWidth: 1,
      borderColor: '#000000',
      showOuterBorder: true,
      showInnerBorder: true,
    },
  });
}

async function walkNode(node: any, ctx: WalkContext): Promise<void> {
  if (ctx.components.length >= MAX_COMPONENTS) {
    return;
  }
  const type = node?.type;
  if (type === 'paragraph') {
    // 遇到非编号段落时，先把积攒的编号段落合并成列表组件
    if (!node.numbering) flushListBuffer(ctx);
    await processParagraph(node, ctx);
  } else if (type === 'table') {
    flushListBuffer(ctx);
    await processTable(node, ctx);
  } else {
    flushListBuffer(ctx);
    for (const child of node.children || []) await walkNode(child, ctx);
  }
}

/**
 * 把 .docx 文件内容转换为排版画布组件
 * @param input.buffer .docx 文件二进制内容
 */
export async function convertDocxToComponents(input: { buffer: Buffer }): Promise<DocxConvertResult> {
  let capturedDocument: any = null;
  try {
    await mammoth.convertToHtml(
      { buffer: input.buffer },
      {
        // HTML 输出不使用，仅通过 transformDocument 拿到解析后的文档 AST
        transformDocument: (document: any) => {
          capturedDocument = document;
          return document;
        },
      }
    );
  } catch (error) {
    console.error('[Template Import] mammoth 解析 docx 失败:', error);
    throw new Error('无法解析 Word 文档：文件可能损坏，或不是 .docx 格式（旧版 .doc 请先另存为 .docx）');
  }

  if (!capturedDocument) {
    throw new Error('无法解析 Word 文档：文件可能损坏，或不是 .docx 格式');
  }

  const ctx: WalkContext = { components: [], warnings: [], imageCount: 0, tableCount: 0, listBuffer: [] };
  await walkNode(capturedDocument, ctx);
  flushListBuffer(ctx);

  if (ctx.components.length >= MAX_COMPONENTS) {
    ctx.warnings.push(`组件数量超过 ${MAX_COMPONENTS} 个，多余内容已忽略`);
  }
  if (ctx.components.length === 0) {
    throw new Error('未能从 Word 文档中提取到内容，请确认文件不是空白文档');
  }

  return { components: ctx.components, warnings: ctx.warnings, imageCount: ctx.imageCount, tableCount: ctx.tableCount };
}