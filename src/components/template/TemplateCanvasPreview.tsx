'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Table as TableIcon, 
  QrCode, 
  Barcode, 
  Box, 
  Variable,
  Ruler,
  Layers
} from 'lucide-react';
import { PAGE_SIZES } from '@/types/editor';

// 组件类型图标映射
const componentTypeIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  heading: <Type className="h-4 w-4" />,
  paragraph: <Type className="h-4 w-4" />,
  list: <Type className="h-4 w-4" />,
  table: <TableIcon className="h-4 w-4" />,
  qrcode: <QrCode className="h-4 w-4" />,
  barcode: <Barcode className="h-4 w-4" />,
  container: <Box className="h-4 w-4" />,
  line: <Ruler className="h-4 w-4" />,
};

const componentTypeLabels: Record<string, string> = {
  text: '文本',
  heading: '标题',
  paragraph: '段落',
  list: '列表',
  table: '表格',
  qrcode: '二维码',
  barcode: '条形码',
  container: '容器',
  line: '分隔线',
};

// 检测模板中的变量 - 支持 [字段名] 和 {{字段名}} 两种格式
const extractVariables = (components: any[]): string[] => {
  const variables: string[] = [];
  const variableRegex = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;

  const traverse = (comp: any) => {
    if (!comp) return;

    const extractFromText = (text: string) => {
      if (!text) return;
      let match;
      variableRegex.lastIndex = 0;
      while ((match = variableRegex.exec(text)) !== null) {
        const varName = (match[1] || match[3])?.trim();
        if (varName && !variables.includes(varName)) {
          variables.push(varName);
        }
      }
    };

    if (comp.text) extractFromText(comp.text);
    if (comp.content) extractFromText(comp.content);
    if (comp.items && Array.isArray(comp.items)) {
      comp.items.forEach((item: string) => extractFromText(item));
    }

    // 遍历表格单元格
    if (comp.tableConfig?.cells) {
      comp.tableConfig.cells.forEach((row: any[]) => {
        row.forEach((cell: any) => {
          if (cell?.content) extractFromText(cell.content);
        });
      });
    }
  };

  components.forEach((comp) => traverse(comp));
  return variables;
};

// 统计组件信息
const analyzeComponents = (components: any[]) => {
  const stats: Record<string, number> = {};
  let totalCount = 0;

  const traverse = (comp: any) => {
    if (!comp) return;
    const type = comp.type || 'unknown';
    stats[type] = (stats[type] || 0) + 1;
    totalCount++;
  };

  components.forEach((comp) => traverse(comp));
  return { stats, totalCount };
};

// 渲染表格组件 - 使用与编辑器一致的样式
const renderTableComponent = (component: any, styleConfig: any): React.ReactNode => {
  const { id, tableConfig } = component;
  
  if (!tableConfig?.cells || tableConfig.cells.length === 0) {
    return (
      <div key={id} className="border border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
        空表格
      </div>
    );
  }

  const { cells = [], colWidths = [], borderWidth = 1, borderColor = '#000000' } = tableConfig;

  return (
    <table 
      key={id}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: styleConfig?.fontSize || 14,
        fontFamily: styleConfig?.fontFamily || 'Arial',
      }}
    >
      <tbody>
        {cells.map((row: any[], rowIndex: number) => (
          <tr key={rowIndex}>
            {row.map((cell: any, colIndex: number) => {
              // 跳过被合并的单元格
              if (cell?.rowSpan === 0 || cell?.colSpan === 0) {
                return null;
              }
              
              const colWidth = colWidths[colIndex];
              
              return (
                <td
                  key={colIndex}
                  rowSpan={cell?.rowSpan || 1}
                  colSpan={cell?.colSpan || 1}
                  style={{
                    border: `${borderWidth}px solid ${borderColor}`,
                    padding: '8px',
                    textAlign: cell?.align || 'left',
                    verticalAlign: cell?.verticalAlign || 'top',
                    fontWeight: cell?.bold ? 'bold' : 'normal',
                    fontStyle: cell?.italic ? 'italic' : 'normal',
                    backgroundColor: cell?.backgroundColor || 'transparent',
                    color: cell?.color || '#000000',
                    fontSize: cell?.fontSize ? `${cell.fontSize}px` : undefined,
                    width: colWidth ? `${colWidth}px` : undefined,
                    minWidth: colWidth ? `${colWidth}px` : undefined,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {cell?.content || ''}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// 渲染单个组件 - 流式布局
const renderComponent = (component: any, styleConfig: any): React.ReactNode => {
  if (!component) return null;

  const { id, type, text, content, textStyle = {}, items = [], tableConfig } = component;
  
  const fontSize = textStyle?.fontSize || styleConfig?.fontSize || 14;
  const fontFamily = styleConfig?.fontFamily || 'Arial';
  
  // 表格组件特殊处理
  if (type === 'table') {
    return renderTableComponent(component, styleConfig);
  }

  // 截断过长的文本用于预览
  const truncateText = (str: string, maxLen: number = 100) => {
    if (!str || str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  };

  switch (type) {
    case 'text':
      return (
        <div 
          key={id}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily,
            fontWeight: textStyle?.bold ? 'bold' : 'normal',
            color: textStyle?.color || '#000000',
            textAlign: textStyle?.align || 'left',
            lineHeight: textStyle?.lineHeight || 1.6,
            marginBottom: textStyle?.paragraphSpacing ? `${textStyle.paragraphSpacing}px` : 0,
          }}
        >
          {truncateText(text || content)}
        </div>
      );
      
    case 'heading': {
      const level = component.level || 1;
      const sizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
      const size = textStyle?.fontSize || sizes[level] || 18;
      const align = textStyle?.align || 'center';
      
      const headingContent = <span style={{ fontWeight: textStyle?.bold !== false ? 'bold' : 'normal' }}>{text || content}</span>;
      
      switch (level) {
        case 1: return <h1 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h1>;
        case 2: return <h2 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h2>;
        case 3: return <h3 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h3>;
        case 4: return <h4 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h4>;
        case 5: return <h5 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h5>;
        case 6: return <h6 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h6>;
        default: return <h1 key={id} style={{ fontSize: `${size}px`, fontFamily, textAlign: align as any, margin: '0 0 16px 0', padding: '8px 0' }}>{headingContent}</h1>;
      }
    }
      
    case 'paragraph': {
      const lines = (text || content || '').split('\n');
      const indent = (component.indent || 2) * 2;
      return (
        <p 
          key={id}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily,
            fontWeight: textStyle?.bold ? 'bold' : 'normal',
            color: textStyle?.color || '#000000',
            textAlign: textStyle?.align || 'justify',
            lineHeight: textStyle?.lineHeight || 1.8,
            textIndent: `${indent}em`,
            margin: '0 0 12px 0',
            padding: '4px 0',
          }}
        >
          {lines.map((line: string, index: number) => (
            <React.Fragment key={index}>
              {truncateText(line)}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    }
      
    case 'list': {
      const listItems = (items || []).map((item: string, index: number) => (
        <li key={index} style={{ marginBottom: '4px' }}>{truncateText(item)}</li>
      ));
      const listStyle = {
        fontSize: `${fontSize}px`,
        fontFamily,
        fontWeight: textStyle?.bold ? 'bold' : 'normal',
        color: textStyle?.color || '#000000',
        lineHeight: textStyle?.lineHeight || 1.8,
        margin: '0 0 12px 0',
        paddingLeft: '2em',
      };
      
      if (component.listType === 'ordered') {
        return <ol key={id} style={listStyle}>{listItems}</ol>;
      }
      return <ul key={id} style={listStyle}>{listItems}</ul>;
    }
      
    case 'qrcode':
      return (
        <div
          key={id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            minWidth: '60px',
            minHeight: '60px',
            padding: '10px',
          }}
        >
          <QrCode className="h-6 w-6 text-slate-400" />
        </div>
      );
      
    case 'barcode':
      return (
        <div
          key={id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            minWidth: '80px',
            minHeight: '40px',
            padding: '10px',
          }}
        >
          <Barcode className="h-4 w-12 text-slate-400" />
        </div>
      );
      
    case 'line': {
      const lineColor = component.color || '#000000';
      const lineThickness = component.thickness || 1;
      return (
        <hr 
          key={id}
          style={{
            border: 'none',
            height: `${lineThickness}px`,
            backgroundColor: lineColor,
            margin: '16px 0',
          }}
        />
      );
    }
      
    default:
      return (
        <div key={id} style={{ fontSize: `${fontSize}px`, fontFamily }}>
          {truncateText(text || content)}
        </div>
      );
  }
};

interface TemplateCanvasPreviewProps {
  templateData: any;
  className?: string;
  showStats?: boolean;
  showVariables?: boolean;
  scale?: number;
}

export function TemplateCanvasPreview({ 
  templateData, 
  className = '',
  showStats = true,
  showVariables = true,
  scale = 0.5,
}: TemplateCanvasPreviewProps) {
  const { pageConfig = {}, components = [], styleConfig = {} } = templateData || {};

  const variables = useMemo(() => extractVariables(components), [components]);
  const { stats, totalCount } = useMemo(() => analyzeComponents(components), [components]);

  // 计算页面尺寸 - 与编辑器一致
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size || 'A4'];
  const isLandscape = pageConfig.orientation === 'landscape';
  
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;
  
  // 页边距 - 与编辑器一致
  const margins = pageConfig.margins || { top: 20, right: 20, bottom: 20, left: 20 };
  
  const contentWidth = canvasWidth - (margins.left + margins.right) * mmToPx;
  const contentHeight = canvasHeight - (margins.top + margins.bottom) * mmToPx;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 统计信息 */}
      {showStats && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Layers className="h-4 w-4" />
            组件统计
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="flex items-center gap-1">
                {componentTypeIcons[type] || <Box className="h-3 w-3" />}
                {componentTypeLabels[type] || type}
                <span className="ml-1 text-xs">{count as number}</span>
              </Badge>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            共 {totalCount} 个组件
          </div>
        </div>
      )}

      {/* 变量列表 */}
      {showVariables && variables.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <Variable className="h-4 w-4" />
            模板变量 ({variables.length}个)
          </div>
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
              <Badge key={variable} variant="outline" className="bg-white text-blue-600 border-blue-200">
                [{variable}]
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* 画布预览 - 与编辑器一致的页边距和布局 */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">画布预览</span>
          <span className="text-xs text-slate-500">
            {pageConfig.size || 'A4'} {isLandscape ? '横向' : '纵向'} · {scale * 100}%
          </span>
        </div>
        
        <ScrollArea className="w-full overflow-auto">
          <div className="flex justify-center p-4">
            <div
              className="bg-white shadow-lg relative"
              style={{
                width: `${canvasWidth * scale}px`,
                minHeight: `${canvasHeight * scale}px`,
                padding: `${margins.top * mmToPx * scale}px ${margins.right * mmToPx * scale}px ${margins.bottom * mmToPx * scale}px ${margins.left * mmToPx * scale}px`,
                fontFamily: styleConfig.fontFamily || 'Arial',
                fontSize: (styleConfig.fontSize || 14) * scale,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
              }}
            >
              {/* 组件内容 - 流式布局 */}
              <div 
                className="flex flex-wrap content-start gap-3"
                style={{ minHeight: `${contentHeight * scale}px` }}
              >
                {components.length > 0 ? (
                  components.map((component: any) => {
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
                          boxSizing: 'border-box',
                        }}
                      >
                        {renderComponent(component, styleConfig)}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm" style={{ minHeight: '200px' }}>
                    暂无组件
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
