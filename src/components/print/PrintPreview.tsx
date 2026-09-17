'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PDFGenerator, htmlToPDF } from '@/lib/print/pdf-generator';
import { Download, Printer, Eye, FileText } from 'lucide-react';

interface PrintPreviewProps {
  open: boolean;
  onClose: () => void;
  content: React.ReactNode;
  title?: string;
  filename?: string;
  recordId?: string;
  children?: React.ReactNode;
}

export function PrintPreview({ open, onClose, content, title = '打印预览', filename = 'document.pdf', recordId }: PrintPreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'preview' | 'html'>('preview');
  const contentRef = useRef<HTMLDivElement>(null);

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
                    margin: 20mm;
                  }
                  body {
                    margin: 0;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
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

  // 导出PDF
  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    setIsLoading(true);
    try {
      await htmlToPDF(contentRef.current, filename);
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换预览模式
  const togglePreviewMode = () => {
    setPreviewMode(prev => prev === 'preview' ? 'html' : 'preview');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {title}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={togglePreviewMode}>
              <Eye className="w-4 h-4 mr-2" />
              {previewMode === 'preview' ? '查看源码' : '查看预览'}
            </Button>
          </div>
        </DialogHeader>

        {/* 预览内容区域 */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6 border rounded-lg min-h-[500px]">
          {previewMode === 'preview' ? (
            <div
              ref={contentRef}
              className="bg-white shadow-lg mx-auto p-8 min-h-[600px]"
              style={{ width: '210mm' }}
            >
              {content}
            </div>
          ) : (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {contentRef.current?.innerHTML || '暂无内容'}
            </pre>
          )}
        </div>

        {/* 操作按钮 */}
        <DialogFooter className="flex gap-2">
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
          <Button
            onClick={handleExportPDF}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isLoading ? '导出中...' : '导出PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 任务打印卡片组件
 */
export function TaskPrintCard({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
        <p className="text-sm text-gray-500 mt-1">任务编号: {data.id}</p>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">状态</label>
          <p className="text-gray-900 mt-1">{data.status}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">优先级</label>
          <p className="text-gray-900 mt-1">{data.priority}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">负责人</label>
          <p className="text-gray-900 mt-1">{data.assignee}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">进度</label>
          <p className="text-gray-900 mt-1">{data.progress}%</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">开始日期</label>
          <p className="text-gray-900 mt-1">{data.startDate}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">截止日期</label>
          <p className="text-gray-900 mt-1">{data.endDate}</p>
        </div>
      </div>

      {/* 描述 */}
      <div>
        <label className="text-sm font-medium text-gray-700">任务描述</label>
        <p className="text-gray-900 mt-1">{data.description}</p>
      </div>

      {/* 标签 */}
      {data.tags && data.tags.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-700">标签</label>
          <div className="flex gap-2 mt-1">
            {data.tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 页脚 */}
      <div className="border-t pt-4 mt-4">
        <p className="text-sm text-gray-500">
          打印时间: {new Date().toLocaleString('zh-CN')}
        </p>
      </div>
    </div>
  );
}
