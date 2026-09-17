'use client';

import React from 'react';
import { AttachmentVariable, AttachmentVariableConfig } from './AttachmentVariable';

// 变量类型定义
export type VariableType = 'text' | 'attachment' | 'date' | 'number' | 'boolean' | 'unknown';

// 变量配置基类
export interface BaseVariableConfig {
  fieldName: string;
  type: VariableType;
}

// 完整变量配置联合类型
export type VariableConfig = BaseVariableConfig | (BaseVariableConfig & AttachmentVariableConfig);

// 判断是否为附件变量配置
export function isAttachmentConfig(config: VariableConfig): config is (BaseVariableConfig & AttachmentVariableConfig) {
  return config.type === 'attachment' && 'displayMode' in config;
}

interface VariableRendererProps {
  config: VariableConfig;
  data: Record<string, any>;
  isEditing?: boolean;
  fieldIdMap?: Record<string, string>;  // 【新增】字段ID映射（字段名 -> 字段ID）
}

/**
 * 统一变量渲染器
 * 根据变量配置类型，自动选择对应的渲染组件
 */
export function VariableRenderer({ config, data, isEditing = false, fieldIdMap = {} }: VariableRendererProps) {
  const { fieldName, type } = config;
  const fieldValue = data[fieldName];

  // 根据类型选择渲染器
  switch (type) {
    case 'attachment':
      // 附件类型使用 AttachmentVariable 组件
      if (isAttachmentConfig(config)) {
        // 确保数据是数组格式
        const attachmentData = Array.isArray(fieldValue) ? fieldValue : 
                              fieldValue ? [fieldValue] : null;
        // 获取字段ID
        const fieldId = fieldIdMap[fieldName];
        return (
          <AttachmentVariable 
            config={config} 
            data={attachmentData} 
            isEditing={isEditing}
            fieldId={fieldId}  // 【新增】传递字段ID
          />
        );
      }
      // 如果没有配置，降级为文本显示
      return <span>{JSON.stringify(fieldValue)}</span>;

    case 'date':
      // 日期类型格式化
      return <span>{formatDateValue(fieldValue)}</span>;

    case 'number':
      // 数字类型
      return <span>{formatNumberValue(fieldValue)}</span>;

    case 'boolean':
      // 布尔类型
      return <span>{formatBooleanValue(fieldValue)}</span>;

    case 'text':
    case 'unknown':
    default:
      // 文本类型或其他未知类型
      return <span>{formatTextValue(fieldValue)}</span>;
  }
}

// 格式化日期值
function formatDateValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // 处理数组格式
  if (Array.isArray(value) && value.length > 0) {
    return formatDateValue(value[0]);
  }

  // 处理对象格式
  if (typeof value === 'object') {
    if (value.text) return value.text;
    if (value.name) return value.name;
  }

  // 处理时间戳
  if (typeof value === 'number') {
    const timestamp = value.toString().length === 10 ? value * 1000 : value;
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN');
    }
  }

  // 字符串直接返回
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return formatDateValue(numValue);
    }
  }

  return String(value);
}

// 格式化数字值
function formatNumberValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (Array.isArray(value) && value.length > 0) {
    return formatNumberValue(value[0]);
  }

  if (typeof value === 'object') {
    if (value.value !== undefined) return String(value.value);
    if (value.text !== undefined) return String(value.text);
  }

  const num = Number(value);
  if (!isNaN(num)) {
    // 根据数值大小决定是否保留小数
    if (Math.abs(num) >= 1000) {
      return num.toLocaleString('zh-CN');
    }
    if (Math.abs(num) < 1 && num !== 0) {
      return num.toFixed(4);
    }
    return String(num);
  }

  return String(value);
}

// 格式化布尔值
function formatBooleanValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '是') return '是';
    if (lower === 'false' || lower === 'no' || lower === '否') return '否';
  }

  if (typeof value === 'number') {
    return value !== 0 ? '是' : '否';
  }

  return String(value);
}

// 格式化文本值（通用）
function formatTextValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'object') {
        return item.text || item.name || item.value || item.label || JSON.stringify(item);
      }
      return String(item);
    }).join(', ');
  }

  if (typeof value === 'object') {
    return value.text || value.name || value.value || value.label || JSON.stringify(value);
  }

  return String(value);
}

/**
 * 智能识别字段类型
 * 根据字段值自动推断字段类型
 */
export function detectFieldType(fieldName: string, value: any): VariableType {
  // 附件类型识别
  if (isAttachmentField(value)) {
    return 'attachment';
  }

  // 日期类型识别（字段名包含日期关键词）
  const dateKeywords = ['日期', '时间', 'date', 'time', ' deadline'];
  if (dateKeywords.some(keyword => fieldName.toLowerCase().includes(keyword))) {
    return 'date';
  }

  // 数字类型识别
  if (typeof value === 'number') {
    return 'number';
  }

  // 布尔类型识别
  if (typeof value === 'boolean') {
    return 'boolean';
  }

  // 默认为文本类型
  return 'text';
}

/**
 * 【简化修复】判断是否为附件字段
 * 只根据飞书 SDK 返回的附件特征判断（必须有 token 或 fileToken）
 * 不再使用容易误判的特征（如 name、type、url）
 */
function isAttachmentField(value: any): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;

  // 只检查附件特有的 token 属性，避免误判其他数组字段
  return value.every(item => 
    item && typeof item === 'object' && 
    ('token' in item || 'fileToken' in item)
  );
}

export default VariableRenderer;
