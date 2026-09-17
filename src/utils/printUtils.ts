/**
 * 打印工具函数
 * 实现真正的系统级打印功能
 */

import { EditorComponent, PageConfig, StyleConfig, Field, PAGE_SIZES } from '@/types/editor';
import { parseComponentVariables } from './variableParser';

// mm 转 px 的比例
const MM_TO_PX = 3.78;

/**
 * 生成打印样式的 CSS
 */
function generatePrintCSS(pageConfig: PageConfig, styleConfig: StyleConfig): string {
  const pageSize = PAGE_SIZES[pageConfig.size];
  const width = pageConfig.orientation === 'landscape' ? pageSize.height : pageSize.width;
  const height = pageConfig.orientation === 'landscape' ? pageSize.width : pageSize.height;
  
  return `
    @page {
      size: ${width}mm ${height}mm;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      width: ${width}mm;
      height: ${height}mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
    }
    
    body {
      font-family: ${styleConfig.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${styleConfig.fontSize}pt;
      line-height: ${styleConfig.lineHeight};
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .print-page {
      width: ${width}mm;
      height: ${height}mm;
      position: relative;
      padding: ${pageConfig.margins.top}mm ${pageConfig.margins.right}mm ${pageConfig.margins.bottom}mm ${pageConfig.margins.left}mm;
      page-break-after: always;
      background: white;
    }
    
    .print-page:last-child {
      page-break-after: auto;
    }
    
    .print-component {
      position: absolute;
      overflow: hidden;
    }
    
    /* 打印时隐藏非打印元素 */
    @media print {
      .no-print {
        display: none !important;
      }
      
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    /* 表格样式 */
    .print-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .print-table th,
    .print-table td {
      border: 1px solid #333;
      padding: 4px 8px;
      text-align: left;
    }
    
    .print-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    /* 图片样式 */
    .print-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    /* 二维码和条形码容器 */
    .print-qrcode,
    .print-barcode {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
}

/**
 * 渲染单个组件为 HTML
 */
function renderComponentToHTML(
  component: Record<string, unknown>,
  styleConfig: StyleConfig
): string {
  const type = component.type as string;
  const width = component.width as number;
  const height = component.height as number;
  
  const baseStyle = `left: ${component.x}px; top: ${component.y}px; width: ${width}px; min-height: ${height}px; z-index: ${component.zIndex || 1};`;
  
  switch (type) {
    case 'text': {
      const fontSize = (component.fontSize || styleConfig.fontSize) as number;
      const fontWeight = component.fontWeight || 'normal';
      const textAlign = component.textAlign || 'left';
      const lineHeight = component.lineHeight || styleConfig.lineHeight;
      const content = component.content as string || '';
      
      return `<div class="print-component" style="${baseStyle} font-size: ${fontSize}pt; font-weight: ${fontWeight}; text-align: ${textAlign}; line-height: ${lineHeight}; font-family: ${styleConfig.fontFamily};">${escapeHtml(content)}</div>`;
    }
    
    case 'line': {
      const thickness = (component.thickness || 1) as number;
      const color = (component.color as string) || '#000000';
      const isVertical = (component.isVertical as boolean) || false;
      
      if (isVertical) {
        return `<div class="print-component" style="${baseStyle} width: ${thickness}px; background-color: ${color};"></div>`;
      }
      return `<div class="print-component" style="${baseStyle} height: ${thickness}px; background-color: ${color};"></div>`;
    }
    
    case 'table': {
      const columns = (component.columns as number) || 3;
      const rows = (component.rows as number) || 3;
      const borderWidth = (component.borderWidth as number) || 1;
      const borderColor = (component.borderColor as string) || '#333333';
      const headerBg = (component.headerBg as string) || '#f0f0f0';
      
      let tableHTML = `<table class="print-table print-component" style="${baseStyle} border-width: ${borderWidth}px; border-color: ${borderColor};">`;
      tableHTML += '<thead><tr>';
      for (let c = 0; c < columns; c++) {
        tableHTML += `<th style="background-color: ${headerBg};">列${c + 1}</th>`;
      }
      tableHTML += '</tr></thead><tbody>';
      for (let r = 0; r < rows; r++) {
        tableHTML += '<tr>';
        for (let c = 0; c < columns; c++) {
          tableHTML += '<td></td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</tbody></table>';
      return tableHTML;
    }
    
    case 'qrcode': {
      const content = component.content as string || '';
      return `<div class="print-component print-qrcode" style="${baseStyle} background: #f5f5f5; border: 1px dashed #ccc; font-size: 10px;">二维码: ${escapeHtml(content.substring(0, 20))}${content.length > 20 ? '...' : ''}</div>`;
    }
    
    case 'barcode': {
      const content = component.content as string || '';
      return `<div class="print-component print-barcode" style="${baseStyle} background: #f5f5f5; border: 1px dashed #ccc; font-size: 10px;">条码: ${escapeHtml(content.substring(0, 20))}${content.length > 20 ? '...' : ''}</div>`;
    }
    
    case 'image': {
      const src = component.src as string || '';
      if (src) {
        return `<img class="print-component print-image" style="${baseStyle}" src="${escapeHtml(src)}" alt="" />`;
      }
      return `<div class="print-component" style="${baseStyle} background: #f5f5f5; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">图片</div>`;
    }
    
    default:
      return `<div class="print-component" style="${baseStyle}">${type}</div>`;
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = { innerHTML: '' };
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 渲染单页内容
 */
function renderPageContent(
  components: EditorComponent[],
  record: Record<string, unknown>,
  fields: Field[],
  styleConfig: StyleConfig
): string {
  return components.map(component => {
    // 解析变量
    const parsedComponent = parseComponentVariables(
      component as unknown as Record<string, unknown>,
      record,
      fields
    );
    return renderComponentToHTML(parsedComponent, styleConfig);
  }).join('\n');
}

/**
 * 生成完整的打印 HTML 文档
 */
export function generatePrintHTML(
  components: EditorComponent[],
  records: Record<string, unknown>[],
  fields: Field[],
  pageConfig: PageConfig,
  styleConfig: StyleConfig,
  templateName: string
): string {
  const css = generatePrintCSS(pageConfig, styleConfig);
  
  const pages = records.map(record => {
    const content = renderPageContent(components, record, fields, styleConfig);
    return `<div class="print-page">\n${content}\n</div>`;
  }).join('\n\n');
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(templateName)} - 打印预览</title>
  <style>${css}</style>
</head>
<body>
${pages}
</body>
</html>`;
}

/**
 * 调用系统打印
 * @param htmlContent 完整的 HTML 内容（包含内联 CSS）
 * @param options 打印选项
 */
export function invokeSystemPrint(
  htmlContent: string,
  options?: {
    onBeforeOpen?: () => void;
    onAfterPrint?: () => void;
    onError?: (error: Error) => void;
  }
): void {
  try {
    options?.onBeforeOpen?.();
    
    // 打开新窗口
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('无法打开打印窗口，请检查浏览器是否阻止了弹出窗口');
    }
    
    // 写入 HTML 内容
    printWindow.document.write(htmlContent);
    printWindow.document.close(); // 必须调用以触发 load 事件
    
    // 等待资源加载完成后打印
    const doPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
        // 打印完成后可选择关闭窗口
        // printWindow.close();
        options?.onAfterPrint?.();
      } catch (err) {
        console.error('打印执行失败:', err);
        options?.onError?.(err as Error);
      }
    };
    
    // 方案1: 监听 load 事件
    printWindow.onload = () => {
      // 额外延迟确保渲染完成
      setTimeout(doPrint, 300);
    };
    
    // 方案2: 备用超时触发（某些浏览器 load 事件可能不可靠）
    setTimeout(() => {
      if (!printWindow.closed) {
        try {
          // 检查是否已经打印过
          if (printWindow.document.readyState === 'complete') {
            doPrint();
          }
        } catch {
          // 窗口可能已关闭，忽略错误
        }
      }
    }, 1000);
    
  } catch (error) {
    console.error('打印失败:', error);
    options?.onError?.(error as Error);
  }
}

/**
 * 打印单条记录
 */
export function printSingleRecord(
  components: EditorComponent[],
  record: Record<string, unknown>,
  fields: Field[],
  pageConfig: PageConfig,
  styleConfig: StyleConfig,
  templateName: string
): void {
  const html = generatePrintHTML(components, [record], fields, pageConfig, styleConfig, templateName);
  invokeSystemPrint(html);
}

/**
 * 打印多条记录（批量打印）
 */
export function printMultipleRecords(
  components: EditorComponent[],
  records: Record<string, unknown>[],
  fields: Field[],
  pageConfig: PageConfig,
  styleConfig: StyleConfig,
  templateName: string
): void {
  if (records.length === 0) {
    alert('请至少选择一条记录进行打印');
    return;
  }
  
  const html = generatePrintHTML(components, records, fields, pageConfig, styleConfig, templateName);
  invokeSystemPrint(html, {
    onError: (error) => {
      alert(`打印失败: ${error.message}`);
    }
  });
}

/**
 * 导出为可下载的 HTML 文件
 */
export function exportAsHTML(
  components: EditorComponent[],
  records: Record<string, unknown>[],
  fields: Field[],
  pageConfig: PageConfig,
  styleConfig: StyleConfig,
  templateName: string
): void {
  const html = generatePrintHTML(components, records, fields, pageConfig, styleConfig, templateName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${templateName}_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
