/**
 * 智能变量解析与渲染引擎
 * 支持两种格式：[字段名]（推荐）和 {{字段名}}（兼容）
 */

import { Field } from '@/types/editor';

/**
 * 检测是否为时间戳
 * @param value 要检测的值
 * @returns 是否为时间戳
 */
function isTimestamp(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  
  // 时间戳范围检测：2000-01-01 到 2100-01-01
  const minTimestamp = 946684800000; // 2000-01-01
  const maxTimestamp = 4102444800000; // 2100-01-01
  
  return value >= minTimestamp && value <= maxTimestamp;
}

/**
 * 格式化时间戳为日期时间字符串
 * @param timestamp 时间戳（毫秒）
 * @param format 格式，可选 'date' | 'datetime' | 'time'
 * @returns 格式化后的日期时间字符串
 */
function formatTimestamp(timestamp: number, format: 'date' | 'datetime' | 'time' = 'datetime'): string {
  try {
    const date = new Date(timestamp);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return String(timestamp);
    }
    
    // 使用 Intl.DateTimeFormat 进行本地化格式化
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    if (format === 'datetime' || format === 'time') {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
    }
    
    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  } catch (error) {
    // 如果格式化失败，返回原始值的字符串形式
    return String(timestamp);
  }
}

// 变量匹配正则：支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
// 优先匹配 [字段名] 格式
const VARIABLE_REGEX = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;

// 变量芯片 CSS 类名
export const VARIABLE_CHIP_CLASS = 'dynamic-variable-chip';

/**
 * 变量解析结果接口
 */
export interface VariableMatch {
  original: string;      // 原始匹配文本，如 {{姓名}}
  fieldName: string;     // 字段名，如 "姓名"
  format?: string;       // 格式说明符（可选），如 "date"
}

/**
 * 解析文本中的所有变量
 * @param text 包含变量的文本
 * @returns 变量匹配列表
 */
export function parseVariables(text: string): VariableMatch[] {
  if (!text) return [];
  
  const matches: VariableMatch[] = [];
  let match;
  
  // 重置正则表达式的 lastIndex
  VARIABLE_REGEX.lastIndex = 0;
  
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    
    // 匹配 [字段名] 或 [字段名:格式] 格式
    // match[1] = 字段名, match[2] = 格式
    // 或匹配 {{字段名}} 或 {{字段名:格式}} 格式
    // match[3] = 字段名, match[4] = 格式
    
    const fieldName = match[1] || match[3];
    const format = match[2] || match[4];
    
    if (fieldName) {
      matches.push({
        original: fullMatch,
        fieldName: fieldName.trim(),
        format: format?.trim(),
      });
    }
  }
  
  return matches;
}

/**
 * 检查文本是否包含变量格式
 * @param text 要检查的文本
 * @returns 是否包含变量
 */
export function containsVariables(text: string): boolean {
  if (!text) return false;
  return VARIABLE_REGEX.test(text);
}

/**
 * 从第一条记录获取字段值（处理字段名到字段ID的映射）
 * @param fieldName 字段名
 * @param records 记录列表
 * @param fields 字段定义列表
 * @returns 字段值或占位符
 */
export function getFieldValue(
  fieldName: string,
  records: any[],
  fields: Field[]
): string {
  // 🔥 调试日志
  console.log('[getFieldValue] Called:', {
    fieldName,
    recordsCount: records?.length,
    fieldsCount: fields?.length,
    firstRecordKeys: records?.[0] ? Object.keys(records[0]).slice(0, 10) : 'no record',
  });
  // 无数据时返回占位符
  if (!records || records.length === 0) {
    return '[暂无数据]';
  }
  
  const firstRecord = records[0] as any;
  
  // 构建字段名到字段ID的映射
  const fieldNameToIdMap: Record<string, string> = {};
  fields.forEach(field => {
    fieldNameToIdMap[field.name] = field.id;
  });
  
  // 首先尝试通过字段名查找映射的字段ID
  const fieldId = fieldNameToIdMap[fieldName];
  
  let value: unknown;
  
  if (fieldId) {
    // 优先使用字段ID从记录对象直接获取（飞书SDK格式）
    if (firstRecord[fieldId] !== undefined) {
      value = firstRecord[fieldId];
    } 
    // 其次尝试从 fields 对象中获取
    else if (firstRecord.fields && firstRecord.fields[fieldId] !== undefined) {
      value = firstRecord.fields[fieldId];
    }
  }
  
  // 如果通过字段ID没找到，尝试直接用字段名
  if (value === undefined || value === null) {
    // 尝试直接从记录对象获取
    if (firstRecord[fieldName] !== undefined) {
      value = firstRecord[fieldName];
    }
    // 尝试从 fields 对象中获取
    else if (firstRecord.fields && firstRecord.fields[fieldName] !== undefined) {
      value = firstRecord.fields[fieldName];
    }
  }
  
  // 处理空值
  if (value === null || value === undefined) {
    return '[空]';
  }
  
  // 处理时间戳类型
  if (isTimestamp(value)) {
    return formatTimestamp(value as number, 'datetime');
  }
  
  // 处理数组类型（多选、人员等）
  if (Array.isArray(value)) {
    if (value.length === 0) return '[空]';
    return value
      .map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          // 🔥 处理人员字段 (IOpenUser)
          if (item.id && item.name && !item.token) {
            return item.name; // 人员字段只显示姓名
          }
          // 如果是数组中的对象，也检查是否包含时间戳
          if (item.text !== undefined && isTimestamp(item.text)) {
            return formatTimestamp(item.text as number, 'datetime');
          }
          return item.name || item.text || item.label || item.value || String(item);
        }
        // 如果数组项是数字，也检查是否是时间戳
        if (typeof item === 'number' && isTimestamp(item)) {
          return formatTimestamp(item, 'datetime');
        }
        return String(item);
      })
      .join(', ');
  }
  
  // 处理对象类型
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // 检查对象中的文本字段是否是时间戳
    if (obj.text !== undefined && isTimestamp(obj.text)) {
      return formatTimestamp(obj.text as number, 'datetime');
    }
    return String(obj.text || obj.name || obj.label || obj.value || JSON.stringify(value));
  }
  
  // 默认返回字符串
  return String(value);
}

/**
 * 生成变量芯片的 HTML
 * @param fieldName 字段名
 * @param value 字段值
 * @returns HTML 字符串
 */
export function generateVariableChipHTML(fieldName: string, value: string): string {
  return `<span 
    class="${VARIABLE_CHIP_CLASS}" 
    contenteditable="false" 
    data-field-name="${fieldName}"
    title="字段：${fieldName}"
  >${value}</span>`;
}

/**
 * 将文本中的变量替换为带样式的 HTML
 * @param text 原始文本
 * @param records 记录列表
 * @param fields 字段定义列表
 * @returns 处理后的 HTML 字符串
 */
export function replaceVariablesWithChips(
  text: string,
  records: any[],
  fields: Field[]
): string {
  if (!text) return '';
  
  const variables = parseVariables(text);
  
  if (variables.length === 0) {
    return text;
  }
  
  let result = text;
  
  variables.forEach(variable => {
    const value = getFieldValue(variable.fieldName, records, fields);
    const chipHTML = generateVariableChipHTML(variable.fieldName, value);
    result = result.split(variable.original).join(chipHTML);
  });
  
  return result;
}

/**
 * 处理粘贴内容，识别变量并返回处理后的内容
 * @param pastedText 粘贴的文本
 * @param records 记录列表
 * @param fields 字段定义列表
 * @returns 处理后的内容（纯文本或HTML）
 */
export function processPastedContent(
  pastedText: string,
  records: any[],
  fields: Field[]
): { hasVariables: boolean; content: string } {
  if (!pastedText) {
    return { hasVariables: false, content: pastedText };
  }
  
  const hasVariables = containsVariables(pastedText);
  
  if (!hasVariables) {
    return { hasVariables: false, content: pastedText };
  }
  
  const processedHTML = replaceVariablesWithChips(pastedText, records, fields);
  
  return { hasVariables: true, content: processedHTML };
}

/**
 * 变量芯片 CSS 样式
 */
export const VARIABLE_CHIP_STYLES = `
  .${VARIABLE_CHIP_CLASS} {
    background-color: #e6f7ff;
    border: 1px solid #91d5ff;
    color: #0050b3;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-weight: 500;
    cursor: default;
    display: inline-block;
    margin: 0 2px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    user-select: none;
  }
  
  .${VARIABLE_CHIP_CLASS}:hover {
    background-color: #bae7ff;
    border-color: #69c0ff;
  }
`;
