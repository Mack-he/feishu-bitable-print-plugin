'use client';

import React from 'react';
import { CanvasComponentNode, Field, FieldTypeMap, StyleConfig, ComponentTextStyle } from '@/types/editor';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';
import { AttachmentVariableConfig } from '@/components/editor/variables';

// 渲染模式
export type RenderMode = 'edit' | 'preview' | 'print';

// 统一渲染器 Props
export interface UnifiedRenderProps {
  component: CanvasComponentNode;
  mode: RenderMode;
  
  // 通用数据
  styleConfig: StyleConfig;
  fields?: Field[];
  fieldTypeMap?: FieldTypeMap;
  record?: Record<string, unknown>;
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  
  // 预览模式特有
  isEmptyPreview?: boolean;
}

/**
 * 统一组件渲染器
 * 用于编辑状态和打印预览的统一渲染逻辑
 */
export function UnifiedComponentRenderer({
  component,
  mode,
  styleConfig,
  fields = [],
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview = false,
}: UnifiedRenderProps) {
  
  switch (component.type) {
    case 'text':
      return renderTextComponent({
        component,
        styleConfig,
        fields,
        fieldTypeMap,
        record,
        attachmentConfigs,
        isEmptyPreview,
        mode,
      });
    
    case 'heading':
      return renderHeadingComponent({
        component,
        styleConfig,
        fields,
        fieldTypeMap,
        record,
        attachmentConfigs,
        isEmptyPreview,
        mode,
      });
    
    case 'paragraph':
      return renderParagraphComponent({
        component,
        styleConfig,
        fields,
        fieldTypeMap,
        record,
        attachmentConfigs,
        isEmptyPreview,
        mode,
      });
    
    case 'list':
      return renderListComponent({
        component,
        styleConfig,
        fields,
        fieldTypeMap,
        record,
        attachmentConfigs,
        isEmptyPreview,
        mode,
      });
    
    case 'table':
      return renderTableComponent({
        component,
        styleConfig,
        fields,
        fieldTypeMap,
        record,
        attachmentConfigs,
        isEmptyPreview,
        mode,
      });
    
    case 'fieldContainer':
      return renderFieldContainerComponent({
        component,
        styleConfig,
        fields,
        fieldTypeMap,
        record,
        attachmentConfigs,
        isEmptyPreview,
        mode,
      });
    
    case 'line':
      return renderLineComponent(component);
    
    case 'qrcode':
      return renderQrcodeComponent(component);
    
    case 'barcode':
      return renderBarcodeComponent(component);
    
    case 'image':
      return renderImageComponent(component);
    
    default:
      return (
        <div className="text-gray-500 p-4">
          未知组件类型: {(component as any).type || 'unknown'}
        </div>
      );
  }
}

// ==================== 文本组件渲染 ====================

interface TextRenderProps {
  component: CanvasComponentNode;
  styleConfig: StyleConfig;
  fields: Field[];
  fieldTypeMap?: FieldTypeMap;
  record?: Record<string, unknown>;
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  isEmptyPreview: boolean;
  mode: RenderMode;
}

function renderTextComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps) {
  const textComp = component as any;
  const textStyle = textComp.textStyle || {};
  const content = textComp.content || textComp.text || '';
  
  // 基础文本样式
  const baseStyles: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: `${textStyle.fontSize || styleConfig.fontSize}px`,
    lineHeight: textStyle.lineHeight || styleConfig.lineHeight,
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'left',
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    fontStyle: textStyle.italic ? 'italic' : 'normal',
    textDecoration: textStyle.underline ? 'underline' : textStyle.lineThrough ? 'line-through' : 'none',
    minHeight: '1em',
    display: 'block',
    width: '100%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
  };
  
  // 标题样式
  if (textStyle.headingLevel) {
    const headingSizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
    const headingStyle = {
      ...baseStyles,
      fontSize: `${headingSizes[textStyle.headingLevel] || 18}px`,
      fontWeight: 'bold',
      marginBottom: '0.5em',
      marginTop: '0.5em',
    };
    
    const Tag = `h${textStyle.headingLevel}` as React.ElementType;
    return (
      <Tag style={headingStyle}>
        <VariableTextRenderer
          text={content || '文本组件'}
          records={record ? [record] : []}
          fields={fields}
          fieldTypeMap={fieldTypeMap}
          tagName="span"
          textStyle={textStyle}
          attachmentConfigs={attachmentConfigs}
          isEditing={mode === 'edit'}
        />
      </Tag>
    );
  }
  
  // 列表样式
  if (textStyle.listType === 'unordered') {
    return (
      <ul style={{ ...baseStyles, marginLeft: '1.5rem', listStyleType: 'disc' }}>
        <li>
          <VariableTextRenderer
            text={content || '文本组件'}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={textStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </li>
      </ul>
    );
  }
  
  if (textStyle.listType === 'ordered') {
    return (
      <ol style={{ ...baseStyles, marginLeft: '1.5rem', listStyleType: 'decimal' }}>
        <li>
          <VariableTextRenderer
            text={content || '文本组件'}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={textStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </li>
      </ol>
    );
  }
  
  // 普通文本
  return (
    <div style={baseStyles}>
      <VariableTextRenderer
        text={content || '文本组件'}
        records={record ? [record] : []}
        fields={fields}
        fieldTypeMap={fieldTypeMap}
        tagName="span"
        textStyle={textStyle}
        attachmentConfigs={attachmentConfigs}
        isEditing={mode === 'edit'}
      />
    </div>
  );
}

// ==================== 标题组件渲染 ====================

function renderHeadingComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps) {
  const headingComp = component as any;
  const level = headingComp.level || 1;
  const headingSizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
  const textStyle = headingComp.textStyle || {};
  const content = headingComp.content || '';
  
  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : `${headingSizes[level]}px`,
    fontWeight: textStyle.bold !== false ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'center',
    lineHeight: textStyle.lineHeight || 1.5,
    margin: '0 0 16px 0',
    padding: '8px 0',
    minHeight: '1em',
    width: '100%',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };
  
  const Tag = `h${level}` as React.ElementType;
  return (
    <Tag style={style}>
      <VariableTextRenderer
        text={content || '标题组件'}
        records={record ? [record] : []}
        fields={fields}
        fieldTypeMap={fieldTypeMap}
        tagName="span"
        textStyle={textStyle}
        attachmentConfigs={attachmentConfigs}
        isEditing={mode === 'edit'}
      />
    </Tag>
  );
}

// ==================== 段落组件渲染 ====================

function renderParagraphComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps) {
  const paraComp = component as any;
  const textStyle = paraComp.textStyle || {};
  const content = paraComp.content || '';
  const lines = content.split('\n');
  
  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : `${styleConfig.fontSize}px`,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'justify',
    lineHeight: textStyle.lineHeight || 1.8,
    textIndent: `${(paraComp.indent || 2) * 2}em`,
    margin: '0 0 12px 0',
    padding: '4px 0',
    minHeight: '1em',
    width: '100%',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };
  
  return (
    <p style={style}>
      {lines.length > 0 ? lines.map((line: string, index: number) => (
        <React.Fragment key={index}>
          <VariableTextRenderer
            text={line}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={textStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      )) : '段落组件'}
    </p>
  );
}

// ==================== 列表组件渲染 ====================

function renderListComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps) {
  const listComp = component as any;
  const textStyle = listComp.textStyle || {};
  const items = listComp.items || [];
  const ListTag = listComp.listType === 'ordered' ? 'ol' : 'ul';
  
  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : `${styleConfig.fontSize}px`,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    lineHeight: textStyle.lineHeight || 1.8,
    margin: '0 0 12px 0',
    paddingLeft: '2em',
    minHeight: '1em',
    width: '100%',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };
  
  return (
    <ListTag style={style}>
      {items.length > 0 ? items.map((item: string, index: number) => (
        <li key={index} style={{ marginBottom: '4px' }}>
          <VariableTextRenderer
            text={item}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={textStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </li>
      )) : <li>列表组件</li>}
    </ListTag>
  );
}

// ==================== 表格组件渲染 ====================

function renderTableComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps) {
  const tableComp = component as any;
  const tableConfig = tableComp.tableConfig;
  
  if (!tableConfig?.cells || tableConfig.cells.length === 0) {
    return (
      <div className="w-full border border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
        空表格
      </div>
    );
  }
  
  const colWidths = tableConfig.colWidths || [];
  const borderWidth = tableConfig.borderWidth || 2;
  const borderColor = tableConfig.borderColor || '#000000';
  
  /**
   * 渲染单元格内容（支持复杂样式）
   */
  const renderCellContent = (
    cellContent: string,
    cellStyle: Record<string, any>
  ): React.ReactNode => {
    // 基础文本样式
    const baseTextStyle: React.CSSProperties = {
      fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
      fontWeight: cellStyle.bold ? 'bold' : 'normal',
      fontStyle: cellStyle.italic ? 'italic' : 'normal',
      color: cellStyle.color || '#000000',
      textAlign: cellStyle.align || 'left',
      lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
      textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
      textTransform: cellStyle.textTransform || 'none',
      margin: 0,
      padding: 0,
      display: 'block',
      width: '100%',
    };
    
    // 标题样式
    if (cellStyle.headingLevel === 1) {
      return (
        <h1 style={{ 
          ...baseTextStyle,
          fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '24px',
          fontWeight: 'bold',
        }}>
          <VariableTextRenderer
            text={cellContent || ''}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={cellStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </h1>
      );
    }
    if (cellStyle.headingLevel === 2) {
      return (
        <h2 style={{ 
          ...baseTextStyle,
          fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '18px',
          fontWeight: 'bold',
        }}>
          <VariableTextRenderer
            text={cellContent || ''}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={cellStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </h2>
      );
    }
    if (cellStyle.headingLevel === 3) {
      return (
        <h3 style={{ 
          ...baseTextStyle,
          fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '16px',
          fontWeight: 'bold',
        }}>
          <VariableTextRenderer
            text={cellContent || ''}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={cellStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </h3>
      );
    }
    
    // 列表样式 - 无序列表
    if (cellStyle.listType === 'unordered' && !cellStyle.headingLevel) {
      return (
        <ul style={{ 
          marginLeft: '1.5rem', 
          paddingLeft: 0,
          textAlign: baseTextStyle.textAlign,
          lineHeight: baseTextStyle.lineHeight,
          marginTop: 0,
          marginBottom: 0,
        }}>
          <li style={{
            fontSize: baseTextStyle.fontSize,
            fontWeight: baseTextStyle.fontWeight,
            fontStyle: baseTextStyle.fontStyle,
            color: baseTextStyle.color,
            textDecoration: baseTextStyle.textDecoration,
          }}>
            <VariableTextRenderer
              text={cellContent || ''}
              records={record ? [record] : []}
              fields={fields}
              fieldTypeMap={fieldTypeMap}
              tagName="span"
              textStyle={cellStyle}
              attachmentConfigs={attachmentConfigs}
              isEditing={mode === 'edit'}
            />
          </li>
        </ul>
      );
    }
    
    // 列表样式 - 有序列表
    if (cellStyle.listType === 'ordered' && !cellStyle.headingLevel) {
      return (
        <ol style={{ 
          marginLeft: '1.5rem', 
          paddingLeft: 0,
          textAlign: baseTextStyle.textAlign,
          lineHeight: baseTextStyle.lineHeight,
          marginTop: 0,
          marginBottom: 0,
        }}>
          <li style={{
            fontSize: baseTextStyle.fontSize,
            fontWeight: baseTextStyle.fontWeight,
            fontStyle: baseTextStyle.fontStyle,
            color: baseTextStyle.color,
            textDecoration: baseTextStyle.textDecoration,
          }}>
            <VariableTextRenderer
              text={cellContent || ''}
              records={record ? [record] : []}
              fields={fields}
              fieldTypeMap={fieldTypeMap}
              tagName="span"
              textStyle={cellStyle}
              attachmentConfigs={attachmentConfigs}
              isEditing={mode === 'edit'}
            />
          </li>
        </ol>
      );
    }
    
    // 链接样式
    if (cellStyle.link) {
      return (
        <a 
          href={cellStyle.link}
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            ...baseTextStyle,
            color: '#3b82f6',
            textDecoration: 'underline',
            display: 'inline',
          }}
        >
          <VariableTextRenderer
            text={cellContent || ''}
            records={record ? [record] : []}
            fields={fields}
            fieldTypeMap={fieldTypeMap}
            tagName="span"
            textStyle={cellStyle}
            attachmentConfigs={attachmentConfigs}
            isEditing={mode === 'edit'}
          />
        </a>
      );
    }
    
    // 默认文本样式
    return (
      <span style={baseTextStyle}>
        <VariableTextRenderer
          text={cellContent || ''}
          records={record ? [record] : []}
          fields={fields}
          fieldTypeMap={fieldTypeMap}
          tagName="span"
          textStyle={cellStyle}
          attachmentConfigs={attachmentConfigs}
          isEditing={mode === 'edit'}
        />
      </span>
    );
  };
  
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      tableLayout: 'fixed',
      fontFamily: styleConfig.fontFamily,
      fontSize: `${styleConfig.fontSize}px`,
    }}>
      <tbody>
        {tableConfig.cells.map((row: any[], rowIndex: number) => (
          <tr key={rowIndex}>
            {row.map((cell: any, colIndex: number) => {
              // 处理合并单元格
              if (cell.rowSpan === 0 || cell.colSpan === 0) {
                return null;
              }
              
              const colWidth = colWidths[colIndex];
              const cellStyle = cell.style || {};
              const cellBorder = cell.border;
              
              // 构建边框样式
              const borderStyles: React.CSSProperties = {};
              if (cellBorder?.top) {
                borderStyles.borderTop = `${cellBorder.width || borderWidth}px solid ${cellBorder.color || borderColor}`;
              }
              if (cellBorder?.right) {
                borderStyles.borderRight = `${cellBorder.width || borderWidth}px solid ${cellBorder.color || borderColor}`;
              }
              if (cellBorder?.bottom) {
                borderStyles.borderBottom = `${cellBorder.width || borderWidth}px solid ${cellBorder.color || borderColor}`;
              }
              if (cellBorder?.left) {
                borderStyles.borderLeft = `${cellBorder.width || borderWidth}px solid ${cellBorder.color || borderColor}`;
              }
              
              // 如果没有设置单元格边框，使用默认边框
              const hasCellBorder = cellBorder?.top || cellBorder?.right || cellBorder?.bottom || cellBorder?.left;
              
              return (
                <td
                  key={colIndex}
                  rowSpan={cell.rowSpan || 1}
                  colSpan={cell.colSpan || 1}
                  style={{
                    border: !hasCellBorder ? `${borderWidth}px solid ${borderColor}` : undefined,
                    padding: '8px',
                    textAlign: cellStyle.align || 'left',
                    verticalAlign: cell.verticalAlign || 'middle',
                    backgroundColor: cell.backgroundColor || cellStyle.backgroundColor || 'transparent',
                    width: colWidth ? `${colWidth}px` : undefined,
                    minWidth: colWidth ? `${colWidth}px` : undefined,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    ...borderStyles,
                  }}
                >
                  {renderCellContent(cell.content || '', cellStyle)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ==================== 其他组件渲染 ====================

function renderLineComponent(component: CanvasComponentNode) {
  const lineComp = component as any;
  return (
    <hr
      style={{
        border: 'none',
        height: `${lineComp.thickness || 1}px`,
        backgroundColor: lineComp.color || '#000000',
        margin: '16px 0',
      }}
    />
  );
}

function renderQrcodeComponent(component: CanvasComponentNode) {
  return (
    <div className="flex items-center justify-center">
      <div className="w-24 h-24 bg-gray-100 border border-gray-300" />
    </div>
  );
}

function renderBarcodeComponent(component: CanvasComponentNode) {
  return (
    <div className="flex items-center justify-center">
      <div className="w-32 h-12 bg-gray-100 border border-gray-300" />
    </div>
  );
}

function renderImageComponent(component: CanvasComponentNode) {
  const imageComp = component as any;
  return (
    <div className="flex items-center justify-center">
      {imageComp.src ? (
        <img
          src={imageComp.src}
          alt={imageComp.alt || ''}
          className="max-w-full max-h-48 object-contain"
        />
      ) : (
        <div className="w-full h-32 bg-gray-100 border border-gray-300 flex items-center justify-center">
          <span className="text-gray-400">图片</span>
        </div>
      )}
    </div>
  );
}

// ==================== 字段容器组件渲染 ====================

/**
 * 检查字段是否有值
 * 支持普通字段和附件字段的检测
 */
function checkFieldHasValue(
  fieldName: string,
  record: Record<string, unknown> | undefined,
  fields: Field[]
): boolean {
  if (!record) return false;
  
  // 构建字段名到字段ID的映射
  const fieldId = fields.find(f => f.name === fieldName)?.id;
  
  let value: unknown;
  
  // 尝试通过字段ID获取值
  if (fieldId) {
    if (record[fieldId] !== undefined) {
      value = record[fieldId];
    } else if (record.fields && (record.fields as Record<string, unknown>)[fieldId] !== undefined) {
      value = (record.fields as Record<string, unknown>)[fieldId];
    }
  }
  
  // 如果通过字段ID没找到，尝试直接用字段名
  if (value === undefined) {
    if (record[fieldName] !== undefined) {
      value = record[fieldName];
    } else if (record.fields && (record.fields as Record<string, unknown>)[fieldName] !== undefined) {
      value = (record.fields as Record<string, unknown>)[fieldName];
    }
  }
  
  // 检查值是否有效
  if (value === null || value === undefined) return false;
  if (value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  
  // 【新增】检查附件字段的预处理数据
  // 附件字段经过 processRecordAttachments 处理后会生成 _fieldName_html 和 _fieldName_names
  const htmlContent = record[`_${fieldName}_html`];
  const fileNames = record[`_${fieldName}_names`];
  
  // 如果有预处理的 HTML 内容或文件名列表，也算有值
  if (htmlContent && typeof htmlContent === 'string' && htmlContent.length > 0) {
    return true;
  }
  if (Array.isArray(fileNames) && fileNames.length > 0) {
    return true;
  }
  
  return true;
}

/**
 * 渲染字段容器组件
 * 根据字段是否有值决定是否显示容器内容
 */
function renderFieldContainerComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps): React.ReactNode {
  const containerComp = component as any;
  const fieldNames = containerComp.fieldNames || [];
  const children = containerComp.children || [];
  const showCondition = containerComp.showCondition || 'any'; // 默认：任意字段有值即显示
  
  // 编辑模式：始终显示容器（方便编辑）
  if (mode === 'edit') {
    return (
      <div 
        className="field-container"
        style={{ 
          width: '100%',
          border: '2px dashed #e5e7eb',
          borderRadius: '4px',
          padding: '8px',
          backgroundColor: '#f9fafb',
        }}
      >
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <span>📦 字段容器</span>
          <span className="text-blue-500">[{fieldNames.join(', ')}]</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {children.map((child: any) => (
            <div key={child.id} style={{ width: '100%' }}>
              <UnifiedComponentRenderer
                component={child}
                mode={mode}
                styleConfig={styleConfig}
                fields={fields}
                fieldTypeMap={fieldTypeMap}
                record={record}
                attachmentConfigs={attachmentConfigs}
                isEmptyPreview={isEmptyPreview}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // 预览/打印模式：根据字段值决定是否显示
  // 空数据预览时：显示容器内容（让用户看到模板结构）
  if (isEmptyPreview) {
    return (
      <div className="field-container" style={{ width: '100%' }}>
        <div className="flex flex-wrap gap-3">
          {children.map((child: any) => (
            <div key={child.id} style={{ width: '100%' }}>
              <UnifiedComponentRenderer
                component={child}
                mode={mode}
                styleConfig={styleConfig}
                fields={fields}
                fieldTypeMap={fieldTypeMap}
                record={record}
                attachmentConfigs={attachmentConfigs}
                isEmptyPreview={isEmptyPreview}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // 有数据时：检查字段是否有值
  const fieldValues = fieldNames.map((fieldName: string) => ({
    name: fieldName,
    hasValue: checkFieldHasValue(fieldName, record, fields),
  }));
  
  // 根据显示条件判断
  const shouldShow = showCondition === 'all'
    ? fieldValues.every((f: { name: string; hasValue: boolean }) => f.hasValue) // 所有字段都有值
    : fieldValues.some((f: { name: string; hasValue: boolean }) => f.hasValue); // 任意字段有值
  
  // 如果不应该显示，返回 null（不渲染任何内容）
  if (!shouldShow) {
    return null;
  }
  
  // 显示容器内容
  return (
    <div className="field-container" style={{ width: '100%' }}>
      <div className="flex flex-wrap gap-3">
        {children.map((child: any) => (
          <div key={child.id} style={{ width: '100%' }}>
            <UnifiedComponentRenderer
              component={child}
              mode={mode}
              styleConfig={styleConfig}
              fields={fields}
              fieldTypeMap={fieldTypeMap}
              record={record}
              attachmentConfigs={attachmentConfigs}
              isEmptyPreview={isEmptyPreview}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default UnifiedComponentRenderer;
