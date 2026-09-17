'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Download, Check, FileText } from 'lucide-react';
import { TaskPrintCard } from './PrintPreview';

interface BatchPrintProps {
  records: any[];
  onPrint?: (selectedIds: string[]) => void;
  onExport?: (selectedIds: string[]) => void;
}

export function BatchPrint({ records, onPrint, onExport }: BatchPrintProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(records.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 选择单个记录
  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  // 批量导出
  const handleBatchExport = async () => {
    if (selectedIds.length === 0) {
      alert('请至少选择一条记录');
      return;
    }

    setIsExporting(true);
    try {
      if (onExport) {
        await onExport(selectedIds);
      } else {
        // 默认批量打印逻辑
        const selectedRecords = records.filter(r => selectedIds.includes(r.id));
        for (const record of selectedRecords) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const content = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${record.title}</title>
                  <style>
                    @media print {
                      @page {
                        margin: 20mm;
                      }
                      body {
                        margin: 0;
                      }
                    }
                    body {
                      font-family: Arial, sans-serif;
                      line-height: 1.6;
                      color: #333;
                      padding: 20px;
                    }
                    .task-card {
                      border: 1px solid #e5e7eb;
                      border-radius: 8px;
                      padding: 20px;
                      margin-bottom: 20px;
                    }
                  </style>
                </head>
                <body>
                  <div class="task-card">
                    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
                      ${record.title}
                    </h1>
                    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                      任务编号: ${record.id}
                    </p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                      <div>
                        <strong>状态:</strong> ${record.status}
                      </div>
                      <div>
                        <strong>优先级:</strong> ${record.priority}
                      </div>
                      <div>
                        <strong>负责人:</strong> ${record.assignee}
                      </div>
                      <div>
                        <strong>进度:</strong> ${record.progress}%
                      </div>
                      <div>
                        <strong>开始日期:</strong> ${record.startDate}
                      </div>
                      <div>
                        <strong>截止日期:</strong> ${record.endDate}
                      </div>
                    </div>
                    <div style="margin-bottom: 20px;">
                      <strong>任务描述:</strong>
                      <p>${record.description}</p>
                    </div>
                    ${record.tags && record.tags.length > 0 ? `
                      <div style="margin-bottom: 20px;">
                        <strong>标签:</strong>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                          ${record.tags.map((tag: string) => `
                            <span style="background: #f3f4f6; padding: 5px 10px; border-radius: 20px; font-size: 14px;">
                              ${tag}
                            </span>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                      <p style="color: #666; font-size: 12px;">
                        打印时间: ${new Date().toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <script>
                    window.onload = function() {
                      setTimeout(function() {
                        window.print();
                        window.close();
                      }, 500);
                    }
                  </script>
                </body>
              </html>
            `;
            printWindow.document.write(content);
            printWindow.document.close();
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      alert(`成功导出 ${selectedIds.length} 条记录`);
    } catch (error) {
      console.error('批量导出失败:', error);
      alert('批量导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 批量打印
  const handleBatchPrint = () => {
    if (selectedIds.length === 0) {
      alert('请至少选择一条记录');
      return;
    }

    setIsPrinting(true);
    try {
      if (onPrint) {
        onPrint(selectedIds);
      } else {
        handleBatchExport();
      }
    } catch (error) {
      console.error('批量打印失败:', error);
      alert('批量打印失败，请重试');
    } finally {
      setIsPrinting(false);
    }
  };

  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount === records.length;
  const isSomeSelected = selectedCount > 0 && selectedCount < records.length;

  return (
    <Card className="p-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {isAllSelected ? '全选' : isSomeSelected ? `已选 ${selectedCount} 项` : '选择'}
            </span>
          </div>
          <Badge variant="secondary">{records.length} 条记录</Badge>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBatchPrint}
            disabled={selectedCount === 0 || isPrinting}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? '打印中...' : '批量打印'}
          </Button>
          <Button
            onClick={handleBatchExport}
            disabled={selectedCount === 0 || isExporting}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? '导出中...' : '导出全部'}
          </Button>
        </div>
      </div>

      {/* 记录列表 */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {records.map((record) => {
            const isSelected = selectedIds.includes(record.id);
            return (
              <Card
                key={record.id}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(record.id, !isSelected)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelect(record.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{record.title}</h4>
                      {isSelected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{record.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {record.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {record.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* 底部统计 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileText className="w-4 h-4" />
          <span>共 {records.length} 条记录</span>
          {selectedCount > 0 && (
            <>
              <span>•</span>
              <span>已选择 {selectedCount} 条</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * 模板打印组件
 */
export function TemplatePrint({
  template,
  records,
}: {
  template: string;
  records: any[];
}) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">模板打印</h3>
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>模板名称:</strong> {template}</p>
          <p><strong>适用记录数:</strong> {records.length} 条</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            编辑模板
          </Button>
          <Button className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            应用模板打印
          </Button>
        </div>
      </div>
    </Card>
  );
}
