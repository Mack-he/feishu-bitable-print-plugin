'use client';

import React, { useMemo } from 'react';
import { VariableRenderer, VariableConfig, detectFieldType, VariableType } from './VariableRenderer';

// 混合内容片段类型
export type ContentSegment = 
  | { type: 'text'; content: string }
  | { type: 'variable'; fieldName: string; config?: VariableConfig };

// 字段类型映射
export type FieldTypeMap = Record<string, VariableType>;

// 字段ID映射（新增）
export type FieldIdMap = Record<string, string>;

interface MixedContentRendererProps {
  content: string;                    // 原始文本内容，包含变量占位符
  data: Record<string, any>;          // 数据对象
  variableConfigs?: Record<string, VariableConfig>;  // 变量配置（可选，用于附件等需要特殊配置的变量）
  fieldTypeMap?: FieldTypeMap;        // 【新增】字段类型映射（字段名 -> 类型）
  fieldIdMap?: FieldIdMap;            // 【新增】字段ID映射（字段名 -> 字段ID）
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 混合内容渲染器
 * 解析文本中的变量占位符（[字段名] 或 {{字段名}}），并智能渲染
 * 支持：纯文本、附件变量（使用 AttachmentVariable）、其他变量
 */
export function MixedContentRenderer({
  content,
  data,
  variableConfigs = {},
  fieldTypeMap = {}, // 【新增】字段类型映射
  fieldIdMap = {},   // 【新增】字段ID映射
  className,
  style
}: MixedContentRendererProps) {
  // 解析内容为片段数组
  const segments = useMemo(() => {
    return parseMixedContent(content);
  }, [content]);

  return (
    <span className={className} style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          // 纯文本片段
          return <span key={index}>{segment.content}</span>;
        } else {
          // 变量片段
          const fieldName = segment.fieldName;
          const fieldValue = data[fieldName];
          
          // lock
          // [核心逻辑] 优先使用预处理的 HTML 内容（_字段名_html）
          // 这对于附件字段特别重要，因为 URL 已经预处理好了
          const htmlFieldName = `_${fieldName}_html`;
          const htmlContent = data[htmlFieldName];
          
          if (htmlContent && typeof htmlContent === 'string' && htmlContent.includes('<img')) {
            // 使用预处理的 HTML 内容
            return (
              <span 
                key={index} 
                className="inline-variable"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            );
          }
          // lock
          
          // 检查是否有预定义的配置
          let config = variableConfigs[fieldName];
          
          if (!config) {
            // 【关键修复】优先使用 fieldTypeMap 判断字段类型，避免数据为空时误判
            let fieldType: VariableType;
            
            if (fieldTypeMap[fieldName]) {
              // 使用预定义的字段类型（从字段元数据获取）
              fieldType = fieldTypeMap[fieldName];
              console.log(`[MixedContentRenderer] 使用 fieldTypeMap 判断 "${fieldName}" 类型:`, fieldType);
            } else {
              // 回退：通过数据值特征判断
              fieldType = detectFieldType(fieldName, fieldValue);
              console.log(`[MixedContentRenderer] 使用 detectFieldType 判断 "${fieldName}" 类型:`, fieldType);
            }
            
            // 【关键修复】如果 fieldTypeMap 返回 undefined，再次检查数据值特征
            // 这可以处理字段名乱码导致无法匹配的情况
            if (!fieldTypeMap[fieldName] && fieldValue) {
              const detectedFromValue = detectFieldType(fieldName, fieldValue);
              if (detectedFromValue === 'attachment') {
                fieldType = 'attachment';
                console.log(`[MixedContentRenderer] 数据值特征表明 "${fieldName}" 是附件类型`);
              }
            }
            
            config = {
              fieldName,
              type: fieldType
            };
            
            // 【关键修复】为附件类型添加默认配置，确保 AttachmentVariable 能正确渲染
            if (fieldType === 'attachment') {
              config = {
                fieldName,
                type: 'attachment',
                displayMode: 'image_only',
                sizeMode: 'auto',
                onePerLine: false,
                align: 'left',
                emptyDisplay: 'default'
              };
            }
          }

          // 渲染变量
          return (
            <span key={index} className="inline-variable">
              <VariableRenderer 
                config={config} 
                data={data} 
                fieldIdMap={fieldIdMap}
              />
            </span>
          );
        }
      })}
    </span>
  );
}

/**
 * 解析混合内容为片段数组
 * 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}} 格式
 */
function parseMixedContent(content: string): ContentSegment[] {
  if (!content || typeof content !== 'string') {
    return [{ type: 'text', content: '' }];
  }

  const segments: ContentSegment[] = [];
  
  // 正则表达式匹配变量占位符
  // [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  const variableRegex = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = variableRegex.exec(content)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    
    // 添加变量前的文本
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, matchStart)
      });
    }
    
    // 提取字段名（支持 [字段名] 和 {{字段名}} 两种格式）
    const fieldName = (match[1] || match[3])?.trim();
    const format = (match[2] || match[4])?.trim();
    
    if (fieldName) {
      segments.push({
        type: 'variable',
        fieldName,
        // 可以在这里存储格式信息
        config: format ? { fieldName, type: 'text' } : undefined
      });
    }
    
    lastIndex = matchEnd;
  }
  
  // 添加剩余文本
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }
  
  return segments;
}

/**
 * 提取文本中的所有变量名
 */
export function extractVariables(content: string): string[] {
  const variableRegex = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = variableRegex.exec(content)) !== null) {
    const fieldName = (match[1] || match[3])?.trim();
    if (fieldName && !variables.includes(fieldName)) {
      variables.push(fieldName);
    }
  }
  
  return variables;
}

/**
 * 检查文本是否包含附件变量
 */
export function hasAttachmentVariable(
  content: string, 
  data: Record<string, any>,
  variableConfigs: Record<string, VariableConfig> = {},
  fieldTypeMap: FieldTypeMap = {} // 【新增】字段类型映射
): boolean {
  const variables = extractVariables(content);
  
  return variables.some(fieldName => {
    // 检查是否有预定义的附件配置
    const config = variableConfigs[fieldName];
    if (config?.type === 'attachment') {
      return true;
    }
    
    // 【关键修复】优先使用 fieldTypeMap 判断
    if (fieldTypeMap[fieldName] === 'attachment') {
      return true;
    }
    
    // 自动检测（通过数据值特征）
    const fieldValue = data[fieldName];
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      const firstItem = fieldValue[0];
      return firstItem && (
        'token' in firstItem || 
        'name' in firstItem || 
        'type' in firstItem ||
        'url' in firstItem
      );
    }
    
    return false;
  });
}

export default MixedContentRenderer;
