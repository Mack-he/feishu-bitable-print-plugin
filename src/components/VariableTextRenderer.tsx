'use client';

import React from 'react';
import { VariableChip } from './VariableChip';
import { AttachmentVariableChip } from './AttachmentVariableChip';
import { AttachmentVariableTag } from '@/components/editor/variables/AttachmentVariableTag';
import { TextVariableTag } from '@/components/editor/variables/TextVariableTag';
import { 
  parseVariables, 
  getFieldValue,
  containsVariables,
  type VariableMatch 
} from '@/utils/smartVariableRenderer';
import { Field, ComponentTextStyle, FieldTypeMap } from '@/types/editor';
import { AttachmentVariableConfig } from '@/components/editor/variables';

// 判断是否为附件字段（使用 fieldTypeMap 优先）
function isAttachmentField(fieldName: string, records: any[], fields: Field[], fieldTypeMap?: FieldTypeMap): boolean {
  console.log('[isAttachmentField] ====== 开始判断 ======', { fieldName, hasTypeMap: !!fieldTypeMap, fieldsCount: fields.length });
  
  // 🔥 【核心修复】优先使用 fieldTypeMap（字段名 -> 字段种类）
  if (fieldTypeMap && fieldTypeMap[fieldName]) {
    const fieldKind = fieldTypeMap[fieldName];
    console.log('[isAttachmentField] 使用 fieldTypeMap[字段名]:', fieldKind);
    if (fieldKind === 'attachment') {
      console.log('[isAttachmentField] => true (fieldTypeMap=attachment)');
      return true;
    }
    if (fieldKind === 'person' || fieldKind === 'text' || fieldKind === 'number' || fieldKind === 'date') {
      console.log('[isAttachmentField] => false (fieldTypeMap=' + fieldKind + ')');
      return false;
    }
  }
  
  // 【关键修复】如果通过字段名找不到，尝试找到字段ID再用ID查找
  // 这可以处理字段名乱码导致无法匹配的问题
  const fieldByName = fields.find(f => f.name === fieldName);
  if (fieldByName?.id && fieldTypeMap && fieldTypeMap[fieldByName.id]) {
    const fieldKind = fieldTypeMap[fieldByName.id];
    console.log('[isAttachmentField] 使用 fieldTypeMap[字段ID]:', fieldKind, '字段ID:', fieldByName.id);
    if (fieldKind === 'attachment') {
      console.log('[isAttachmentField] => true (fieldTypeMap[id]=attachment)');
      return true;
    }
  }
  
  // 其次使用字段查找（兼容旧逻辑）
  const field = fields.find(f => f.name === fieldName || f.id === fieldName);
  console.log('[isAttachmentField] 查找字段结果:', { fieldName, found: !!field, fieldKind: field?.fieldKind, fieldId: field?.id });
  
  if (field?.fieldKind) {
    if (field.fieldKind === 'attachment') {
      console.log('[isAttachmentField] => true (fieldKind=attachment)');
      return true;
    }
    if (field.fieldKind === 'person' || field.fieldKind === 'text' || field.fieldKind === 'number') {
      console.log('[isAttachmentField] => false (fieldKind=' + field.fieldKind + ')');
      return false;
    }
  }
  
  // 使用字段 type 判断
  if (field) {
    const fieldType = field.type;
    if (fieldType === 'attachment' || String(fieldType) === '17') {
      console.log('[isAttachmentField] => true (type=attachment/17)');
      return true;
    }
    const nonAttachmentTypes = ['text', 'number', 'singleSelect', 'multiSelect', 'date', 'phone', 'email', 'url', 'user', 'person', '1', '2', '3', '4', '5', '11', '13', '15'];
    if (nonAttachmentTypes.includes(fieldType) || nonAttachmentTypes.includes(String(fieldType))) {
      console.log('[isAttachmentField] => false (non-attachment type)');
      return false;
    }
  }
  
  // 回退到值判断
  console.log('[isAttachmentField] 回退到值判断');
  if (!records || records.length === 0) return false;
  
  const record = records[0];
  const value = record[fieldName] || record.fields?.[fieldName];
  
  if (!Array.isArray(value) || value.length === 0) return false;
  
  const firstItem = value[0];
  
  // 排除人员字段
  if (firstItem && ('id' in firstItem) && ('name' in firstItem)) {
    const id = String(firstItem.id || '');
    const hasEnName = 'enName' in firstItem || 'en_name' in firstItem;
    const hasFileToken = 'fileToken' in firstItem || ('token' in firstItem && firstItem.permission);
    
    if (hasEnName) return false;
    if (hasFileToken) return true;
    if (id.startsWith('ou_')) return false;
  }
  
  return firstItem && (
    ('fileToken' in firstItem && typeof firstItem.fileToken === 'string') ||
    ('previewUrl' in firstItem && typeof firstItem.previewUrl === 'string')
  );
}

// 获取附件数据
function getAttachmentData(fieldName: string, records: any[]): { htmlContent?: string; rawData?: any[]; fileNames?: string[] } | null {
  if (!records || records.length === 0) return null;
  
  const record = records[0];
  
  // 【调试日志】打印所有可用字段
  console.log('[getAttachmentData] 调试:', {
    fieldName,
    allKeys: Object.keys(record),
    htmlFieldName: `_${fieldName}_html`,
    hasHtmlField: !!record[`_${fieldName}_html`],
    hasRawField: !!record[fieldName],
    hasNamesField: !!record[`_${fieldName}_names`],
    hasFieldsProp: !!record.fields?.[fieldName],
    // 【新增】打印 records[0] 的所有 _html 字段
    allHtmlFields: Object.keys(record).filter(key => key.endsWith('_html')),
  });
  
  // 获取原始附件数组
  const rawData = record[fieldName] || record.fields?.[fieldName];
  
  // 获取预处理HTML内容
  const htmlContent = record[`_${fieldName}_html`];
  
  // 【新增】获取文件名列表
  const fileNames = record[`_${fieldName}_names`];
  
  // 【修复】同时返回 HTML、原始数据和文件名列表，让 AttachmentVariableChip 根据配置选择
  const result: { htmlContent?: string; rawData?: any[]; fileNames?: string[] } = {};
  
  if (htmlContent && typeof htmlContent === 'string') {
    result.htmlContent = htmlContent;
    console.log(`[getAttachmentData] ✅ 包含预处理HTML: _${fieldName}_html`);
  }
  
  if (Array.isArray(rawData) && rawData.length > 0) {
    result.rawData = rawData;
    console.log('[getAttachmentData] ✅ 包含原始数组数据:', rawData.length, '个附件');
  }
  
  // 【新增】返回文件名列表
  if (Array.isArray(fileNames) && fileNames.length > 0) {
    result.fileNames = fileNames;
    console.log('[getAttachmentData] ✅ 包含文件名列表:', fileNames.length, '个');
  }
  
  if (Object.keys(result).length === 0) {
    console.log('[getAttachmentData] ⚠️ 无任何数据');
    return null;
  }
  
  return result;
}

interface VariableTextRendererProps {
  text: string;
  records: any[];
  fields: Field[];
  fieldTypeMap?: FieldTypeMap; // 【新增】字段类型映射
  className?: string;
  tagName?: 'p' | 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  textStyle?: Partial<ComponentTextStyle>;
  // 附件变量配置
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  // 事件处理
  onEditAttachment?: (fieldName: string) => void;
  onDeleteAttachment?: (fieldName: string) => void;
  // 选中的变量
  selectedVariable?: string | null;
  // 是否处于编辑状态
  isEditing?: boolean;
}

/**
 * 变量文本渲染组件（增强版）
 * 将文本中的 {{字段名}} 替换为带样式的变量芯片
 * 支持附件字段使用 AttachmentVariableChip 组件渲染
 * 支持继承父组件的文本样式（字体大小、颜色等）
 */
export const VariableTextRenderer: React.FC<VariableTextRendererProps> = ({
  text,
  records,
  fields,
  fieldTypeMap, // 【新增】
  className = '',
  tagName: Tag = 'span',
  textStyle,
  attachmentConfigs = {},
  onEditAttachment,
  onDeleteAttachment,
  selectedVariable,
  isEditing = false,
}) => {
  // 🔥 调试日志
  console.log('[VariableTextRenderer] Render:', {
    textPreview: text?.substring(0, 30),
    recordsCount: records?.length,
    fieldsCount: fields?.length,
    hasTypeMap: !!fieldTypeMap, // 【新增】
    isEditing,
    hasVariables: containsVariables(text),
    variables: containsVariables(text) ? parseVariables(text).map(v => v.fieldName) : [],
  });
  if (!text) {
    return <Tag className={className}>&nbsp;</Tag>;
  }

  // 检查是否包含变量
  if (!containsVariables(text)) {
    return <Tag className={className}>{text}</Tag>;
  }

  // 解析变量
  const variables = parseVariables(text);
  
  // 分割文本和变量
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  variables.forEach((variable, index) => {
    const startIndex = text.indexOf(variable.original, lastIndex);
    
    // 添加变量前的文本
    if (startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, startIndex)}
        </span>
      );
    }
    
    const fieldName = variable.fieldName;
    
    // 检查是否为附件字段
    if (isAttachmentField(fieldName, records, fields, fieldTypeMap)) {
      if (isEditing) {
        // 编辑状态：显示简单的变量标签 [字段名]
        parts.push(
          <AttachmentVariableTag
            key={`var-${index}`}
            fieldName={fieldName}
            isEditing={true}
            onEdit={() => onEditAttachment?.(fieldName)}
            onDelete={() => onDeleteAttachment?.(fieldName)}
          />
        );
      } else {
        // 预览状态：显示实际的附件内容
        const attachmentData = getAttachmentData(fieldName, records);
        const config = attachmentConfigs[fieldName];
        
        parts.push(
          <AttachmentVariableChip
            key={`var-${index}`}
            fieldName={fieldName}
            data={attachmentData}
            config={config}
            textStyle={textStyle}
            isSelected={selectedVariable === fieldName}
            isEditing={false}
            onEdit={() => onEditAttachment?.(fieldName)}
            onDelete={() => onDeleteAttachment?.(fieldName)}
          />
        );
      }
    } else {
      // 普通文本字段
      if (isEditing) {
        // 编辑状态：显示变量标签 [字段名]
        parts.push(
          <TextVariableTag
            key={`var-${index}`}
            fieldName={fieldName}
            isEditing={true}
            onEdit={() => onEditAttachment?.(fieldName)}
            onDelete={() => onDeleteAttachment?.(fieldName)}
          />
        );
      } else {
        // 预览状态：显示字段值
        const value = getFieldValue(fieldName, records, fields);
        
        // 【修复】打印预览模式下，空字段不显示任何内容
        if (value === '[空]' || value === '[暂无数据]' || value === '') {
          // 不添加任何内容到 parts，保持空白
        } else {
          parts.push(
            <VariableChip
              key={`var-${index}`}
              fieldName={fieldName}
              value={value}
              textStyle={textStyle}
            />
          );
        }
      }
    }
    
    lastIndex = startIndex + variable.original.length;
  });
  
  // 添加最后的文本
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-final">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <Tag className={className}>{parts}</Tag>;
};

export default VariableTextRenderer;
