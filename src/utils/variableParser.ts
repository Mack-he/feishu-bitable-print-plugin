/**
 * 变量解析引擎
 * 用于将文本中的 [字段名] 替换为实际值
 */

import { Field } from '@/types/editor';

// 变量格式: [字段名] 或 [字段名:格式]
const VARIABLE_REGEX = /\[([^\]]+)\]/g;

// 日期格式化选项
type DateFormat = 'default' | 'date' | 'time' | 'datetime' | 'year' | 'month' | 'day';

// 格式化日期
function formatDate(value: unknown, format: DateFormat = 'default'): string {
  if (!value) return '';
  
  const date = new Date(value as string | number);
  if (isNaN(date.getTime())) return String(value);
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    case 'time':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    case 'datetime':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case 'year':
      return String(date.getFullYear());
    case 'month':
      return pad(date.getMonth() + 1);
    case 'day':
      return pad(date.getDate());
    default:
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}

// 格式化数字
function formatNumber(value: unknown, options?: {
  decimals?: number;
  thousandsSeparator?: boolean;
  prefix?: string;
  suffix?: string;
}): string {
  if (value === null || value === undefined) return '';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  let result = options?.decimals !== undefined 
    ? num.toFixed(options.decimals)
    : String(num);
  
  if (options?.thousandsSeparator) {
    const [int, dec] = result.split('.');
    result = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? `.${dec}` : '');
  }
  
  return (options?.prefix || '') + result + (options?.suffix || '');
}

// 解析变量路径 (支持嵌套字段如: user.name)
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// 解析单个变量
function parseVariable(
  variableName: string,
  record: Record<string, unknown>,
  fields: Field[]
): string {
  // 检查是否有格式说明符 (例如: 日期:date)
  const [fieldName, format] = variableName.split(':');
  
  // 首先尝试从字段定义中查找
  const field = fields.find(f => f.name === fieldName || f.placeholder === `[${fieldName}]`);
  
  // 获取值
  let value: unknown;
  
  if (field) {
    // 使用字段 ID 从记录中获取值
    value = record[field.id] ?? record[fieldName];
  } else {
    // 直接从记录中获取
    value = getNestedValue(record, fieldName);
  }
  
  // 处理系统变量
  if (fieldName === '打印时间') {
    return formatDate(new Date(), (format as DateFormat) || 'datetime');
  }
  
  if (fieldName === '表格名') {
    return (record['__tableName__'] as string) || '未命名表格';
  }
  
  if (fieldName === '页码') {
    return (record['__pageNumber__'] as string) || '1';
  }
  
  if (fieldName === '总页数') {
    return (record['__totalPages__'] as string) || '1';
  }
  
  // 处理空值
  if (value === null || value === undefined) {
    return '';
  }
  
  // 处理数组 (多选字段)
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  // 处理对象
  if (typeof value === 'object') {
    // 尝试获取常见的显示属性
    const obj = value as Record<string, unknown>;
    return (obj.text || obj.name || obj.label || obj.value || JSON.stringify(value)) as string;
  }
  
  // 处理日期类型
  if (field?.type === 'date' || field?.type === 'createTime' || field?.type === 'modifyTime') {
    return formatDate(value, (format as DateFormat) || 'date');
  }
  
  // 处理数字类型
  if (field?.type === 'number') {
    return formatNumber(value);
  }
  
  // 默认返回字符串
  return String(value);
}

/**
 * 解析文本中的所有变量
 * @param text 包含变量占位符的文本
 * @param record 数据记录
 * @param fields 字段定义列表
 * @returns 替换后的文本
 */
export function parseVariables(
  text: string,
  record: Record<string, unknown>,
  fields: Field[]
): string {
  if (!text) return '';
  
  return text.replace(VARIABLE_REGEX, (match, variableName) => {
    return parseVariable(variableName, record, fields);
  });
}

/**
 * 解析组件内容中的变量
 * @param component 组件对象
 * @param record 数据记录
 * @param fields 字段定义列表
 * @returns 解析后的内容
 */
export function parseComponentVariables(
  component: Record<string, unknown>,
  record: Record<string, unknown>,
  fields: Field[]
): Record<string, unknown> {
  const result = { ...component };
  
  // 解析文本内容
  if (typeof result.content === 'string') {
    result.content = parseVariables(result.content, record, fields);
  }
  
  // 解析二维码内容
  if (result.type === 'qrcode' && typeof result.content === 'string') {
    result.content = parseVariables(result.content, record, fields);
  }
  
  // 解析条形码内容
  if (result.type === 'barcode' && typeof result.content === 'string') {
    result.content = parseVariables(result.content, record, fields);
  }
  
  return result;
}

/**
 * 从文本中提取所有变量名
 * @param text 包含变量占位符的文本
 * @returns 变量名列表
 */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  
  const variables: string[] = [];
  let match;
  
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    const varName = match[1].split(':')[0]; // 移除格式说明符
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

/**
 * 检查文本是否包含变量
 * @param text 文本
 * @returns 是否包含变量
 */
export function hasVariables(text: string): boolean {
  return VARIABLE_REGEX.test(text);
}

/**
 * 获取当前打印时间
 * @param format 日期格式
 * @returns 格式化的日期字符串
 */
export function getPrintTime(format: DateFormat = 'datetime'): string {
  return formatDate(new Date(), format);
}

export type { DateFormat };
