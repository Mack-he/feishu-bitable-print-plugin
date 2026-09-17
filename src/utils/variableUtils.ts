/**
 * 变量解析和自动渲染工具函数
 * 支持两种格式：[字段名]（推荐）和 {{字段名}}（兼容）
 */

import { FeishuContext } from '@/types/editor';

// 变量匹配正则表达式：支持 [字段名] 或 {{字段名}}
// 优先匹配 [字段名] 格式
const VARIABLE_REGEX = /\[([^\]]+)\]|\{\{([^}]+)\}\}/g;

/**
 * 判断是否是时间戳
 * @param value 要检查的值
 * @returns 是否是时间戳
 */
function isTimestamp(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  
  // 检查是否在合理的时间戳范围内（2000年到2030年）
  // 支持毫秒级和秒级时间戳
  const year2000 = 946684800000;
  const year2030 = 1893456000000;
  
  // 如果是秒级时间戳，乘以1000后检查
  if (value < year2000 && value * 1000 >= year2000 && value * 1000 <= year2030) {
    return true;
  }
  
  // 毫秒级时间戳
  return value >= year2000 && value <= year2030;
}

/**
 * 格式化时间戳为可读日期时间
 * @param timestamp 时间戳（毫秒或秒）
 * @returns 格式化后的日期时间字符串
 */
function formatTimestamp(timestamp: number): string {
  try {
    // 如果是秒级时间戳，转换为毫秒
    let msTimestamp = timestamp;
    if (timestamp < 10000000000) {
      msTimestamp = timestamp * 1000;
    }
    
    const date = new Date(msTimestamp);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return String(timestamp);
    }
    
    // 格式化为: YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn('[VariableUtils] 时间格式化失败:', error);
    return String(timestamp);
  }
}

/**
 * 解析变量值
 * @param fieldName 字段名
 * @param context 飞书上下文
 * @returns 解析后的值
 */
export function resolveVariableValue(
  fieldName: string,
  context: FeishuContext | null
): string {
  if (!context) {
    return `[加载中...]`;
  }

  // 查找字段 ID
  const fieldId = context.fieldNameToIdMap[fieldName];
  if (!fieldId) {
    return `[未知字段:${fieldName}]`;
  }

  // 检查是否有首条记录数据
  if (!context.firstRecordData) {
    return `[暂无数据]`;
  }

  // 获取原始值
  const rawValue = context.firstRecordData[fieldId];

  if (rawValue === undefined || rawValue === null) {
    return `[空]`;
  }

  // 检查是否是时间戳
  if (isTimestamp(rawValue)) {
    console.log('[VariableUtils] 检测到时间戳字段:', fieldName, rawValue);
    return formatTimestamp(rawValue as number);
  }

  // 格式化复杂类型
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          // 检查数组项是否包含时间戳
          if (item.time && isTimestamp(item.time)) {
            return formatTimestamp(item.time as number);
          }
          return item.name || item.text || String(item);
        }
        // 检查数组项是否是时间戳
        if (isTimestamp(item)) {
          return formatTimestamp(item as number);
        }
        return String(item);
      })
      .join(', ');
  }

  if (typeof rawValue === 'object') {
    // 处理对象类型
    const obj = rawValue as any;
    // 检查对象是否包含时间戳
    if (obj.time && isTimestamp(obj.time)) {
      return formatTimestamp(obj.time as number);
    }
    return obj.name || obj.text || obj.value || JSON.stringify(rawValue);
  }

  return String(rawValue);
}

/**
 * 检查文本是否包含变量
 * @param text 要检查的文本
 * @returns 是否包含变量
 */
export function containsVariables(text: string): boolean {
  return VARIABLE_REGEX.test(text);
}

/**
 * 提取文本中的所有变量名
 * @param text 要提取的文本
 * @returns 变量名数组
 */
export function extractVariableNames(text: string): string[] {
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  // 重置正则表达式的 lastIndex
  VARIABLE_REGEX.lastIndex = 0;
  
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    // match[1] 是 [字段名] 格式的字段名
    // match[2] 是 {{字段名}} 格式的字段名
    const fieldName = match[1] || match[2];
    if (fieldName) {
      variables.push(fieldName);
    }
  }
  
  return variables;
}

/**
 * 替换文本中的变量为真实值
 * @param text 包含变量的文本
 * @param context 飞书上下文
 * @returns 替换后的文本
 */
export function replaceVariablesInText(
  text: string,
  context: FeishuContext | null
): string {
  return text.replace(VARIABLE_REGEX, (_, fieldName1, fieldName2) => {
    // fieldName1 是 [字段名] 格式的字段名
    // fieldName2 是 {{字段名}} 格式的字段名
    const fieldName = fieldName1 || fieldName2;
    return resolveVariableValue(fieldName, context);
  });
}

/**
 * 生成变量芯片的 HTML
 * @param fieldName 字段名
 * @param value 真实值
 * @returns HTML 字符串
 */
export function generateVariableChipHtml(fieldName: string, value: string): string {
  const escapedValue = escapeHtml(value);
  const escapedFieldName = escapeHtml(fieldName);
  
  return `<span 
    class="var-chip" 
    contenteditable="false" 
    data-field-name="${escapedFieldName}"
    title="字段：${escapedFieldName}"
  >${escapedValue}</span>`;
}

/**
 * 替换文本中的变量为变量芯片 HTML
 * @param text 包含变量的文本
 * @param context 飞书上下文
 * @returns 替换后的 HTML 字符串
 */
export function replaceVariablesWithChips(
  text: string,
  context: FeishuContext | null
): string {
  return text.replace(VARIABLE_REGEX, (_, fieldName) => {
    const value = resolveVariableValue(fieldName, context);
    return generateVariableChipHtml(fieldName, value);
  });
}

/**
 * HTML 转义
 * @param text 要转义的文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 从变量芯片中提取字段名
 * @param element 变量芯片元素
 * @returns 字段名
 */
export function getFieldNameFromChip(element: Element): string | null {
  return element.getAttribute('data-field-name');
}

/**
 * 检查元素是否是变量芯片
 * @param element 要检查的元素
 * @returns 是否是变量芯片
 */
export function isVariableChip(element: Element): boolean {
  return element.classList.contains('var-chip');
}
