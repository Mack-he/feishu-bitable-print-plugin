'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Printer, Eye, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CanvasComponentNode, PageConfig, StyleConfig, PAGE_SIZES } from '@/types/editor';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';
import { parseVariables } from '@/utils/variableParser';

interface EnhancedPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  components: CanvasComponentNode[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  records?: any[];
  fields?: any[];
  title?: string;
  filename?: string;
}

// 获取基础文本样式
function getBaseTextStyles(styleConfig: StyleConfig, textStyle?: any): React.CSSProperties {
  return {
    fontFamily: styleConfig.fontFamily,
    fontSize: `${textStyle?.fontSize || styleConfig.fontSize}px`,
    lineHeight: textStyle?.lineHeight || styleConfig.lineHeight,
    color: textStyle?.color || '#000000',
    textAlign: (textStyle?.align as any) || 'left',
    fontWeight: textStyle?.bold ? 'bold' : textStyle?.fontWeight || 'normal',
    fontStyle: textStyle?.italic ? 'italic' : 'normal',
    textDecoration: textStyle?.underline ? 'underline' : textStyle?.lineThrough ? 'line-through' : 'none',
  };
}

// 渲染文本组件
function renderTextComponent(
  component: any,
  styleConfig: StyleConfig,
  previewRecord?: any,
  fields?: any[]
) {
  const { content = '', textStyle = {} } = component;
  const baseStyles = getBaseTextStyles(styleConfig, textStyle);
  
  const displayContent = previewRecord 
    ? parseVariables(content, previewRecord, fields || [])
    : content;

  if (textStyle.headingLevel) {
    const headingSizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
    const headingStyle = {
      ...baseStyles,
      fontSize: `${headingSizes[textStyle.headingLevel] || 18}px`,
      fontWeight: 'bold',
      marginBottom: '0.5em',
      marginTop: '0.5em',
    };
    const headingContent = (
      <VariableTextRenderer
        text={displayContent || ''}
        records={previewRecord ? [previewRecord] : []}
        fields={fields || []}
        tagName="span"
        textStyle={textStyle}
      />
    );
    
    switch (textStyle.headingLevel) {
      case 1: return <h1 style={headingStyle}>{headingContent}</h1>;
      case 2: return <h2 style={headingStyle}>{headingContent}</h2>;
      case 3: return <h3 style={headingStyle}>{headingContent}</h3>;
      case 4: return <h4 style={headingStyle}>{headingContent}</h4>;
      case 5: return <h5 style={headingStyle}>{headingContent}</h5>;
      case 6: return <h6 style={headingStyle}>{headingContent}</h6>;
      default: return <h1 style={headingStyle}>{headingContent}</h1>;
    }
  }

  if (textStyle.listType === 'unordered') {
    return (
      <ul style={{ ...baseStyles, marginLeft: '1.5rem', listStyleType: 'disc' }}>
        <li>
          <VariableTextRenderer
            text={displayContent || ''}
            records={previewRecord ? [previewRecord] : []}
            fields={fields || []}
            tagName="span"
            textStyle={textStyle}
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
            text={displayContent || ''}
            records={previewRecord ? [previewRecord] : []}
            fields={fields || []}
            tagName="span"
            textStyle={textStyle}
          />
        </li>
      </ol>
    );
  }

  return (
    <span style={{...baseStyles, minHeight: '1em', display: 'inline-block'}}>
      <VariableTextRenderer
        text={displayContent || ''}
        records={previewRecord ? [previewRecord] : []}
        fields={fields || []}
        tagName="span"
        textStyle={textStyle}
      />
    </span>
  );
}

// 渲染标题组件
function renderHeadingComponent(
  component: any,
  styleConfig: StyleConfig,
  previewRecord?: any,
  fields?: any[]
) {
  const { content = '', level = 1, textStyle = {} } = component;
  const displayContent = previewRecord
    ? parseVariables(content, previewRecord, fields || [])
    : content;

  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize || (level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 18 : 16),
    fontWeight: textStyle.bold !== false ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'center',
    lineHeight: textStyle.lineHeight || 1.5,
    margin: '0 0 16px 0',
    padding: '8px 0',
  };
  
  const headingContent = (
    <VariableTextRenderer
      text={displayContent || ''}
      records={previewRecord ? [previewRecord] : []}
      fields={fields || []}
      tagName="span"
      textStyle={textStyle}
    />
  );
  
  switch (level) {
    case 1: return <h1 style={style}>{headingContent}</h1>;
    case 2: return <h2 style={style}>{headingContent}</h2>;
    case 3: return <h3 style={style}>{headingContent}</h3>;
    case 4: return <h4 style={style}>{headingContent}</h4>;
    case 5: return <h5 style={style}>{headingContent}</h5>;
    case 6: return <h6 style={style}>{headingContent}</h6>;
    default: return <h1 style={style}>{headingContent}</h1>;
  }
}

// 渲染段落组件
function renderParagraphComponent(
  component: any,
  styleConfig: StyleConfig,
  previewRecord?: any,
  fields?: any[]
) {
  const { content = '', indent = 2, textStyle = {} } = component;
  const displayContent = previewRecord
    ? parseVariables(content, previewRecord, fields || [])
    : content;

  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize || styleConfig.fontSize,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'justify',
    lineHeight: textStyle.lineHeight || 1.8,
    textIndent: `${indent * 2}em`,
    margin: '0 0 12px 0',
    padding: '4px 0',
  };

  const lines = displayContent.split('\n');
  return (
    <p style={style}>
      {lines.map((line: string, index: number) => (
        <React.Fragment key={index}>
          <VariableTextRenderer
            text={line}
            records={previewRecord ? [previewRecord] : []}
            fields={fields || []}
            tagName="span"
            textStyle={textStyle}
          />
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
}

// 渲染列表组件
function renderListComponent(
  component: any,
  styleConfig: StyleConfig,
  previewRecord?: any,
  fields?: any[]
) {
  const { items = [], listType = 'unordered', textStyle = {} } = component;

  const style: React.CSSProperties = {
    fontFamily: styleConfig.fontFamily,
    fontSize: textStyle.fontSize || styleConfig.fontSize,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    lineHeight: textStyle.lineHeight || 1.8,
    margin: '0 0 12px 0',
    paddingLeft: '2em',
  };

  const itemStyle: React.CSSProperties = {
    marginBottom: '4px',
  };

  const ListTag = listType === 'ordered' ? 'ol' : 'ul';
  
  return (
    <ListTag style={style}>
      {items.map((item: string, index: number) => {
        const displayItem = previewRecord
          ? parseVariables(item, previewRecord, fields || [])
          : item;
        return (
          <li key={index} style={itemStyle}>
            <VariableTextRenderer
              text={displayItem}
              records={previewRecord ? [previewRecord] : []}
              fields={fields || []}
              tagName="span"
              textStyle={textStyle}
            />
          </li>
        );
      })}
    </ListTag>
  );
}

// 渲染表格组件
function renderTableComponent(component: any, styleConfig: StyleConfig) {
  const { tableConfig } = component;
  if (!tableConfig) return null;

  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: styleConfig.fontFamily,
      fontSize: styleConfig.fontSize,
    }}>
      <tbody>
        {tableConfig.rows.map((row: any, rowIndex: number) => (
          <tr key={rowIndex}>
            {row.cells.map((cell: any, cellIndex: number) => (
              <td
                key={cellIndex}
                style={{
                  border: '1px solid #ccc',
                  padding: '8px',
                  textAlign: cell.align || 'left',
                  fontWeight: cell.bold ? 'bold' : 'normal',
                }}
              >
                {cell.content}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 渲染单个组件
function renderComponent(
  component: CanvasComponentNode,
  styleConfig: StyleConfig,
  previewRecord?: any,
  fields?: any[]
) {
  switch (component.type) {
    case 'text':
      return renderTextComponent(component, styleConfig, previewRecord, fields);
    case 'heading':
      return renderHeadingComponent(component, styleConfig, previewRecord, fields);
    case 'paragraph':
      return renderParagraphComponent(component, styleConfig, previewRecord, fields);
    case 'list':
      return renderListComponent(component, styleConfig, previewRecord, fields);
    case 'table':
      return renderTableComponent(component, styleConfig);
    case 'line':
      const lineComp = component as any;
      return (
        <hr style={{
          border: 'none',
          height: `${lineComp.thickness || 1}px`,
          backgroundColor: lineComp.color || '#000000',
          margin: '16px 0',
        }} />
      );
    default:
      return null;
  }
}

export function EnhancedPrintPreview({
  open,
  onClose,
  components,
  pageConfig,
  styleConfig,
  records,
  fields,
  title = '打印预览',
  filename = 'document.pdf',
}: EnhancedPrintPreviewProps) {
  const [scale, setScale] = useState(1);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => {
        const newScale = Math.max(0.5, Math.min(2, prev + delta));
        return Math.round(newScale * 10) / 10;
      });
    }
  }, []);

  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // 直接打印
  const handlePrint = () => {
    if (contentRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <style>
                @media print {
                  @page {
                    margin: ${pageConfig.margins.top}mm ${pageConfig.margins.right}mm ${pageConfig.margins.bottom}mm ${pageConfig.margins.left}mm;
                  }
                  body {
                    margin: 0;
                    font-family: ${styleConfig.fontFamily}, Arial, sans-serif;
                    font-size: ${styleConfig.fontSize}px;
                    line-height: ${styleConfig.lineHeight};
                  }
                  .no-print {
                    display: none !important;
                  }
                }
                body {
                  font-family: ${styleConfig.fontFamily}, Arial, sans-serif;
                  font-size: ${styleConfig.fontSize}px;
                  line-height: ${styleConfig.lineHeight};
                  color: #333;
                }
              </style>
            </head>
            <body>
              ${contentRef.current.innerHTML}
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  // 获取预览记录
  const previewRecord = records && records.length > 0 ? records[0] : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {title}
            </DialogTitle>
            
            {/* 缩放控制 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 2}
                className="h-8 w-8"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="h-8 w-8"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 ml-2">
                Ctrl+滚轮缩放
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* 预览内容区域 */}
        <div 
          className="flex-1 overflow-auto bg-gray-100 p-6"
          onWheel={handleWheel}
          style={{ maxHeight: 'calc(95vh - 140px)' }}
        >
          {/* 多页预览 */}
          <div className="flex flex-col items-center gap-8">
            {records && records.length > 0 ? (
              // 批量打印预览 - 每页一条记录
              records.map((record, index) => (
                <div
                  key={record.id || index}
                  ref={index === 0 ? contentRef : null}
                  className="bg-white shadow-lg mx-auto p-8"
                  style={{
                    width: `${canvasWidth}px`,
                    minHeight: `${canvasHeight}px`,
                    padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
                    fontFamily: styleConfig.fontFamily,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    marginBottom: `${20 * scale}px`,
                  }}
                >
                  {/* 页眉 */}
                  <div className="text-xs text-gray-400 text-center mb-4">
                    第 {index + 1} 页 / 共 {records.length} 页
                  </div>
                  
                  {/* 组件内容 */}
                  <div className="flex flex-wrap content-start gap-3">
                    {components.map((component) => {
                      const layoutWidth = component.layout?.width || '100%';
                      const widthPercent = layoutWidth === '100%' ? 100 : 
                                          layoutWidth === '50%' ? 50 :
                                          layoutWidth === '33%' ? 33.333 : 25;
                      
                      return (
                        <div
                          key={component.id}
                          style={{
                            flex: `0 0 ${widthPercent}%`,
                            maxWidth: `${widthPercent}%`,
                            padding: '4px',
                          }}
                        >
                          {renderComponent(component, styleConfig, record, fields)}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 页脚 */}
                  <div className="text-xs text-gray-400 text-center mt-8">
                    打印时间: {new Date().toLocaleString('zh-CN')}
                  </div>
                </div>
              ))
            ) : (
              // 单页预览
              <div
                ref={contentRef}
                className="bg-white shadow-lg mx-auto p-8"
                style={{
                  width: `${canvasWidth}px`,
                  minHeight: `${canvasHeight}px`,
                  padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
                  fontFamily: styleConfig.fontFamily,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                }}
              >
                {/* 组件内容 */}
                <div className="flex flex-wrap content-start gap-3">
                  {components.map((component) => {
                    const layoutWidth = component.layout?.width || '100%';
                    const widthPercent = layoutWidth === '100%' ? 100 : 
                                        layoutWidth === '50%' ? 50 :
                                        layoutWidth === '33%' ? 33.333 : 25;
                    
                    return (
                      <div
                        key={component.id}
                        style={{
                          flex: `0 0 ${widthPercent}%`,
                          maxWidth: `${widthPercent}%`,
                          padding: '4px',
                        }}
                      >
                        {renderComponent(component, styleConfig, previewRecord, fields)}
                      </div>
                    );
                  })}
                </div>
                
                {/* 页脚 */}
                <div className="text-xs text-gray-400 text-center mt-8">
                  打印时间: {new Date().toLocaleString('zh-CN')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <DialogFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedPrintPreview;
