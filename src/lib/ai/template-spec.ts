// AI 生成模板：提示词构建 + 大模型返回结果的规范化校验
//
// 大模型返回的是自由格式 JSON，这里统一收敛成编辑器认识的组件模型。
// 字段约定与 src/data/preset-templates/_helpers.ts 保持一致：
//   - textStyle.fontSize 必须是数字（编辑器拼 `${fontSize}px`）
//   - 加粗用 textStyle.bold 布尔值（不是 fontWeight）
//   - 对齐用 textStyle.align（不是 textAlign）
//   - 段后距用 textStyle.paragraphSpacing 数字

import type { PageConfig, StyleConfig } from '@/types/editor';
import { DEFAULT_PAGE_CONFIG, DEFAULT_STYLE_CONFIG } from '@/types/editor';

export interface AiFieldBrief {
  name: string;
  type?: string;
  fieldKind?: string;
}

export interface AiGenerateRequest {
  mode: 'natural' | 'layout' | 'image';
  prompt?: string;
  layoutId?: string | null;
  layoutName?: string | null;
  imageDataUrl?: string | null;
  fields?: AiFieldBrief[];
  tableName?: string | null;
  pageConfig?: Partial<PageConfig> | null;
}

export interface NormalizedTemplate {
  name: string;
  description: string;
  components: any[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  /** 模板里用到、但当前表格没有的变量名 */
  unknownVariables: string[];
  /** 变量名（去掉中括号），按出现顺序去重 */
  variables: string[];
  /** 被丢弃的非法组件数量 */
  droppedComponents: number;
}

export const AI_MAX_COMPONENTS = 80;
const MAX_TEXT_LENGTH = 3000;
const MAX_TABLE_ROWS = 60;
const MAX_TABLE_COLS = 14;

const COMPONENT_TYPES = ['text', 'heading', 'paragraph', 'list', 'table', 'line', 'qrcode', 'barcode', 'checkbox'] as const;

const LAYOUT_LABELS: Record<string, string> = {
  single: '单栏布局：从上到下单列排布，标题居中，正文左对齐',
  double: '双栏布局：用两列宽度约 50% 的表格模拟左右分栏',
  'header-content': '标题+内容：顶部大标题，下面依次是说明文字与内容区',
  'form-style': '表单样式：字段名在左、填写区在右的表格，适合登记表/申请表',
  'card-style': '卡片样式：按信息分组，每组一个带标题的小表格',
  'table-style': '表格样式：主体是一张大表格，行列分明',
};

// ========== 文本清洗 ==========

/** 去掉 HTML 标签、markdown 强调符号，并把各种变量写法统一成 [字段名] */
export function sanitizeText(input: unknown, maxLength: number = MAX_TEXT_LENGTH): string {
  if (input === null || input === undefined) return '';
  let text = typeof input === 'string' ? input : String(input);

  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // markdown：标题符号 / 粗斜体 / 行内代码 / 列表符号
  text = text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '');

  // 变量写法统一：{{字段}} / ${字段} / {字段} / 【字段】 → [字段]
  text = text
    .replace(/\{\{\s*([^{}]{1,40}?)\s*\}\}/g, '[$1]')
    .replace(/\$\{\s*([^{}]{1,40}?)\s*\}/g, '[$1]')
    .replace(/\{\s*([^{}\n]{1,40}?)\s*\}/g, '[$1]')
    .replace(/【\s*([^【】\n]{1,40}?)\s*】/g, '[$1]');

  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text.slice(0, maxLength);
}

/** 提取文本里的 [变量] */
export function extractVariablesFromText(text: string): string[] {
  const result: string[] = [];
  const regex = /\[([^[\]\n]{1,40})\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    if (name && !result.includes(name)) result.push(name);
  }
  return result;
}

// ========== 样式规范化 ==========

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^\d.+-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value: unknown, fallback = '#000000'): string {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(color) || /^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^rgba?\([\d\s.,%]+\)$/i.test(color)) return color;
  return fallback;
}

function normalizeAlign(value: unknown, fallback: 'left' | 'center' | 'right' | 'justify') {
  const align = typeof value === 'string' ? value.toLowerCase() : '';
  if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') return align;
  if (align === 'start' || align === 'justify-all') return 'left';
  if (align === 'end') return 'right';
  return fallback;
}

function normalizeTextStyle(raw: any, defaults: Partial<Record<string, unknown>> = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const fontWeight = source.fontWeight ?? source.font_weight;
  const bold =
    typeof source.bold === 'boolean'
      ? source.bold
      : fontWeight === 'bold' || fontWeight === 'bolder' || toNumber(fontWeight, 0) >= 600;

  const style: Record<string, unknown> = {
    fontSize: clamp(toNumber(source.fontSize ?? source.size, toNumber(defaults.fontSize, 14)), 8, 72),
    color: normalizeColor(source.color ?? defaults.color, '#000000'),
    bold,
    align: normalizeAlign(source.align ?? source.textAlign, 'left'),
  };

  if (source.italic !== undefined) style.italic = Boolean(source.italic);
  if (source.underline !== undefined) style.underline = Boolean(source.underline);
  const lineHeight = toNumber(source.lineHeight, NaN);
  if (Number.isFinite(lineHeight)) style.lineHeight = clamp(lineHeight, 0.8, 3);
  const paragraphSpacing = toNumber(source.paragraphSpacing ?? source.marginBottom, NaN);
  if (Number.isFinite(paragraphSpacing)) style.paragraphSpacing = clamp(paragraphSpacing, 0, 60);

  return style;
}

// ========== 组件规范化 ==========

function normalizeTableConfig(raw: any) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const rawCells = Array.isArray(source.cells) ? source.cells : [];
  const rows: any[][] = [];

  for (const rawRow of rawCells.slice(0, MAX_TABLE_ROWS)) {
    const cells = Array.isArray(rawRow) ? rawRow : [rawRow];
    const row = cells.slice(0, MAX_TABLE_COLS).map((cell: any, colIndex: number) => {
      if (cell && typeof cell === 'object') {
        return {
          id: `c-${rows.length}-${colIndex}`,
          content: sanitizeText(cell.content ?? cell.text ?? '', 500),
          rowSpan: clamp(Math.round(toNumber(cell.rowSpan, 1)), 1, MAX_TABLE_ROWS),
          colSpan: clamp(Math.round(toNumber(cell.colSpan, 1)), 1, MAX_TABLE_COLS),
          style: { fontSize: clamp(toNumber(cell.style?.fontSize ?? cell.fontSize, 13), 8, 40) },
        };
      }
      return {
        id: `c-${rows.length}-${colIndex}`,
        content: sanitizeText(cell, 500),
        rowSpan: 1,
        colSpan: 1,
        style: { fontSize: 13 },
      };
    });
    if (row.length > 0) rows.push(row);
  }

  if (rows.length === 0) return null;

  // 补正方形：表格渲染按第一行列数取列宽，缺列会错位
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  for (const row of rows) {
    while (row.length < maxCols) {
      row.push({ id: `c-pad-${rows.indexOf(row)}-${row.length}`, content: '', rowSpan: 1, colSpan: 1, style: { fontSize: 13 } });
    }
  }

  const colWidths = Array.isArray(source.colWidths)
    ? source.colWidths.slice(0, maxCols).map((w: unknown) => clamp(Math.round(toNumber(w, 0)), 0, 800))
    : [];

  return {
    cells: rows,
    colWidths,
    headerRows: clamp(Math.round(toNumber(source.headerRows, 0)), 0, MAX_TABLE_ROWS),
    footerRows: clamp(Math.round(toNumber(source.footerRows, 0)), 0, MAX_TABLE_ROWS),
    borderWidth: clamp(toNumber(source.borderWidth, 1), 0, 6),
    borderColor: normalizeColor(source.borderColor, '#000000'),
    showOuterBorder: source.showOuterBorder !== false,
    showInnerBorder: source.showInnerBorder !== false,
  };
}

function normalizeComponent(raw: any, index: number): any | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
  if (!COMPONENT_TYPES.includes(type as (typeof COMPONENT_TYPES)[number])) return null;

  const id = `ai-${Date.now().toString(36)}-${index}`;

  switch (type) {
    case 'text':
    case 'heading':
    case 'paragraph': {
      const content = sanitizeText(raw.content ?? raw.text);
      if (!content) return null;
      const isHeading = type === 'heading';
      const level = clamp(Math.round(toNumber(raw.level, 1)), 1, 6);
      const headingSize = [0, 24, 20, 18, 16, 14, 12][level] || 18;
      return {
        id,
        type: isHeading ? 'heading' : type,
        content,
        ...(isHeading ? { level } : {}),
        ...(type === 'paragraph' ? { indent: clamp(Math.round(toNumber(raw.indent, 2)), 0, 8) } : {}),
        textStyle: normalizeTextStyle(raw.textStyle ?? raw, {
          fontSize: isHeading ? headingSize : type === 'paragraph' ? 14 : 14,
          color: isHeading ? '#000000' : '#333333',
        }),
      };
    }
    case 'list': {
      const rawItems = Array.isArray(raw.items) ? raw.items : [];
      const items = rawItems
        .map((item: unknown) => sanitizeText(item, 500))
        .filter((item: string) => item.length > 0)
        .slice(0, 50);
      if (items.length === 0) return null;
      return {
        id,
        type: 'list',
        items,
        listType: raw.listType === 'ordered' ? 'ordered' : 'unordered',
        textStyle: normalizeTextStyle(raw.textStyle ?? raw, { fontSize: 14, color: '#333333' }),
      };
    }
    case 'table': {
      const tableConfig = normalizeTableConfig(raw.tableConfig ?? raw);
      if (!tableConfig) return null;
      return { id, type: 'table', tableConfig };
    }
    case 'line':
      return {
        id,
        type: 'line',
        color: normalizeColor(raw.color, '#000000'),
        thickness: clamp(toNumber(raw.thickness, 1), 1, 8),
        style: ['solid', 'dashed', 'dotted'].includes(raw.style) ? raw.style : 'solid',
      };
    case 'qrcode': {
      const content = sanitizeText(raw.content, 200);
      if (!content) return null;
      return { id, type: 'qrcode', content, size: clamp(toNumber(raw.size, 80), 40, 200) };
    }
    case 'barcode': {
      const content = sanitizeText(raw.content, 120);
      if (!content) return null;
      return { id, type: 'barcode', content, format: typeof raw.format === 'string' ? raw.format : 'CODE128' };
    }
    case 'checkbox':
      return {
        id,
        type: 'checkbox',
        size: clamp(Math.round(toNumber(raw.size, 24)), 10, 120),
        checked: Boolean(raw.checked),
        borderColor: normalizeColor(raw.borderColor, '#000000'),
        borderWidth: clamp(toNumber(raw.borderWidth, 1.5), 1, 4),
        align: normalizeAlign(raw.align, 'left'),
      };
    default:
      return null;
  }
}

/** 把大模型/规则生成的结果收敛为编辑器可用的模板数据 */
export function normalizeGeneratedTemplate(
  raw: any,
  options: { fields?: AiFieldBrief[]; pageConfig?: Partial<PageConfig> | null; styleConfig?: Partial<StyleConfig> | null } = {}
): NormalizedTemplate {
  const source = raw && typeof raw === 'object' ? (raw.template ?? raw.data ?? raw) : {};
  const rawComponents = Array.isArray(source.components) ? source.components : [];

  const components: any[] = [];
  let droppedComponents = 0;
  for (const item of rawComponents) {
    if (components.length >= AI_MAX_COMPONENTS) break;
    const component = normalizeComponent(item, components.length);
    if (component) components.push(component);
    else droppedComponents += 1;
  }

  const pageConfig: PageConfig = {
    ...DEFAULT_PAGE_CONFIG,
    ...(options.pageConfig || {}),
    margins: {
      ...DEFAULT_PAGE_CONFIG.margins,
      ...(options.pageConfig?.margins || {}),
    },
  };

  const styleConfig: StyleConfig = { ...DEFAULT_STYLE_CONFIG, ...(options.styleConfig || {}) };

  const variables: string[] = [];
  const visit = (component: any) => {
    if (component.content) {
      for (const name of extractVariablesFromText(component.content)) {
        if (!variables.includes(name)) variables.push(name);
      }
    }
    if (Array.isArray(component.items)) {
      for (const item of component.items) {
        for (const name of extractVariablesFromText(String(item))) {
          if (!variables.includes(name)) variables.push(name);
        }
      }
    }
    if (component.tableConfig?.cells) {
      for (const row of component.tableConfig.cells) {
        for (const cell of row) {
          for (const name of extractVariablesFromText(String(cell.content || ''))) {
            if (!variables.includes(name)) variables.push(name);
          }
        }
      }
    }
  };
  components.forEach(visit);

  const knownFields = new Set((options.fields || []).map((field) => field.name));
  const systemVariables = new Set(['表格名', '打印时间', '页码', '总页数', '当前日期', '日期']);
  const unknownVariables = knownFields.size
    ? variables.filter((name) => !knownFields.has(name) && !systemVariables.has(name))
    : [];

  const name = sanitizeText(source.name ?? source.title, 60) || 'AI生成模板';
  const description = sanitizeText(source.description ?? source.summary, 120);

  return {
    name,
    description,
    components,
    pageConfig,
    styleConfig,
    variables,
    unknownVariables,
    droppedComponents,
  };
}

// ========== 提示词 ==========

export function buildSystemPrompt(): string {
  return `你是一名中文单据/表单排版设计专家。你的任务是根据用户需求，输出一个「打印模板」的 JSON，模板由若干竖向排列的组件构成。

【输出格式】只输出 JSON，不要输出解释、Markdown 代码块或注释：
{
  "name": "模板名称（不超过20字）",
  "description": "一句话说明（不超过40字）",
  "components": [ 组件... ]
}

【可用组件类型】只能使用下面 6 种，禁止其它类型：
1. 文本/标题/段落（三者结构相同，用 type 区分）
   {"type":"text","content":"文本内容","textStyle":{"fontSize":14,"color":"#333333","bold":false,"align":"left","paragraphSpacing":8}}
   {"type":"heading","level":1,"content":"员工入职登记表","textStyle":{"fontSize":24,"bold":true,"align":"center","paragraphSpacing":16}}
   {"type":"paragraph","indent":2,"content":"正文段落","textStyle":{"fontSize":14,"align":"justify","lineHeight":1.8}}
2. 列表 {"type":"list","items":["第一项","第二项"],"listType":"ordered","textStyle":{"fontSize":14}}
3. 表格 {"type":"table","tableConfig":{"cells":[[{"content":"姓名"},{"content":"[姓名]"}]],"colWidths":[90,180],"borderWidth":1,"borderColor":"#000000","showOuterBorder":true,"showInnerBorder":true}}
   - cells 是二维数组，每行单元格数量必须一致，最多 12 列、40 行
   - colWidths 是每列宽度（px），长度与列数一致，总和不超过 660
   - 表格是排版主力：字段信息区、签名区、明细行都用表格来做，不要用空格对齐
4. 分隔线 {"type":"line"}

【样式硬性要求】
- fontSize 必须是数字（不能写 "24px"），加粗写 bold:true（不能写 fontWeight），对齐写 align（不能写 textAlign）
- 字段占位符统一写成 [字段名]，例如 [姓名]、[部门]
- 只能用下面【可用字段】里出现的字段名做占位符；确实需要而字段列表里没有的，写中文标签文字并用下划线占位，不要凭空造字段
- 组件数量控制在 40 个以内，标题只出现一次
- 全文使用中文，禁止 HTML 标签、Markdown 语法、emoji`;
}

export function buildUserPrompt(request: AiGenerateRequest): string {
  const fields = request.fields || [];
  const fieldLines = fields.length
    ? fields
        .map((field) => {
          const kind = field.fieldKind && field.fieldKind !== 'other' ? `（${field.fieldKind}）` : '';
          return `- ${field.name}${kind}`;
        })
        .join('\n')
    : '（当前表格没有可用字段，请用常见中文标签 + 下划线占位）';

  const parts: string[] = [];
  parts.push(`【数据表】${request.tableName || '未命名表格'}`);
  parts.push(`【可用字段】共 ${fields.length} 个，占位符必须写在这些字段名上：\n${fieldLines}`);
  parts.push(`【纸张】A4 纵向，页边距 20mm，正文可用宽度约 660px，标题居中`);

  if (request.mode === 'layout' && request.layoutId) {
    parts.push(`【布局要求】${LAYOUT_LABELS[request.layoutId] || request.layoutName || '单栏布局'}`);
  }
  if (request.mode === 'image') {
    parts.push(
      '【图片识别】用户上传了一张参考图，请按图片的版式结构还原：先看标题位置与层级，再看表格的行列划分与合并关系，最后补上签字/盖章区。文字内容用可用字段的占位符替换，不要照抄图片里的示例数据。'
    );
  }

  const requirement = sanitizeText(request.prompt, 2000);
  parts.push(`【用户需求】${requirement || '请根据字段生成一个通用的业务单据模板'}`);

  return parts.join('\n\n');
}