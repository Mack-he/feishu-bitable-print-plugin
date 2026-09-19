// 服务端专用：导入排版模板的统一入口
//
// 把 .docx / .xlsx 文件转换为模板编辑器可直接加载的数据结构：
//   { components, pageConfig, styleConfig }
// 返回结果与 AI 生成接口（/api/ai/generate-template）的 template 字段同构，
// 前端可以复用「保存模板并进入编辑器」的同一条链路。

import { convertDocxToComponents } from './docx';
import { convertXlsxToComponents } from './xlsx';
import { DEFAULT_PAGE_CONFIG, DEFAULT_STYLE_CONFIG } from '@/types/editor';
import type { PageConfig, StyleConfig } from '@/types/editor';
import { extractVariablesFromText } from '@/lib/ai/template-spec';

export type ImportFileType = 'docx' | 'xlsx';

export interface ImportRequestContext {
  fileName?: string;
  /** 当前数据表字段（用于检测模板里用到的未知变量） */
  fields?: { name?: string }[];
}

export interface ImportTemplateData {
  name: string;
  description: string;
  components: any[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  /** 模板里用到的变量名（去掉中括号），按出现顺序去重 */
  variables: string[];
  /** 用到了、但当前表格没有的变量名 */
  unknownVariables: string[];
  warnings: string[];
  source: ImportFileType;
  /** Excel 导入时实际使用的工作表名 */
  sheetName?: string;
}

const SYSTEM_VARIABLES = new Set(['表格名', '打印时间', '页码', '总页数', '当前日期', '日期']);

function collectVariables(components: any[]): string[] {
  const names: string[] = [];
  const push = (text: string) => {
    for (const name of extractVariablesFromText(text)) {
      if (!names.includes(name)) names.push(name);
    }
  };
  for (const component of components) {
    if (component?.content) push(String(component.content));
    if (Array.isArray(component?.items)) {
      for (const item of component.items) push(String(item ?? ''));
    }
    const cells = component?.tableConfig?.cells;
    if (Array.isArray(cells)) {
      for (const row of cells) {
        for (const cell of row || []) {
          if (cell?.content) push(String(cell.content));
        }
      }
    }
  }
  return names;
}

function stripExtension(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, '');
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(0, dot) : base).trim();
}

/**
 * 转换导入文件为模板数据
 */
export async function convertTemplateFile(
  fileType: ImportFileType,
  buffer: Buffer,
  context: ImportRequestContext = {}
): Promise<ImportTemplateData> {
  const baseName = stripExtension(context.fileName || '');
  const name = (baseName || `导入的${fileType === 'docx' ? 'Word' : 'Excel'}模板`).slice(0, 60);

  let components: any[] = [];
  let warnings: string[] = [];
  let sheetName: string | undefined;
  let pageConfigOverrides: Partial<PageConfig> = {};

  if (fileType === 'docx') {
    const result = await convertDocxToComponents({ buffer });
    components = result.components;
    warnings = result.warnings;
  } else {
    const result = await convertXlsxToComponents(buffer);
    components = result.components;
    warnings = result.warnings;
    sheetName = result.sheetName;
    pageConfigOverrides = result.pageConfig;
  }

  if (components.length === 0) {
    throw new Error('未能从文件中提取到任何排版内容');
  }

  const pageConfig: PageConfig = { ...DEFAULT_PAGE_CONFIG, ...pageConfigOverrides };
  const styleConfig: StyleConfig = { ...DEFAULT_STYLE_CONFIG };

  const variables = collectVariables(components);
  const knownFields = new Set(
    (context.fields || []).map((field) => field?.name).filter((name): name is string => !!name && !!name.trim())
  );
  const unknownVariables = knownFields.size
    ? variables.filter((name) => !knownFields.has(name) && !SYSTEM_VARIABLES.has(name))
    : [];

  const description =
    fileType === 'docx'
      ? '由 Word 文档导入的排版模板'
      : `由 Excel 工作簿导入的排版模板${sheetName ? `（工作表：${sheetName}）` : ''}`;

  return {
    name,
    description,
    components,
    pageConfig,
    styleConfig,
    variables,
    unknownVariables,
    warnings,
    source: fileType,
    sheetName,
  };
}