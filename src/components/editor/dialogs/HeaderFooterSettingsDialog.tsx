'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderFooterSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headerRows: number;
  footerRows: number;
  onHeaderRowsChange: (rows: number) => void;
  onFooterRowsChange: (rows: number) => void;
  maxRows: number;
}

export const HeaderFooterSettingsDialog: React.FC<HeaderFooterSettingsDialogProps> = ({
  open,
  onOpenChange,
  headerRows,
  footerRows,
  onHeaderRowsChange,
  onFooterRowsChange,
  maxRows,
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);

  // 处理鼠标按下，开始拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) {
      return;
    }
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // 处理鼠标移动，更新位置
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // 如果不打开，不渲染
  if (!open) return null;

  // 表头行增减
  const incrementHeader = () => {
    if (headerRows < Math.min(2, maxRows)) {
      onHeaderRowsChange(headerRows + 1);
    }
  };

  const decrementHeader = () => {
    if (headerRows > 0) {
      onHeaderRowsChange(headerRows - 1);
    }
  };

  // 表尾行增减
  const incrementFooter = () => {
    if (footerRows < Math.min(2, maxRows)) {
      onFooterRowsChange(footerRows + 1);
    }
  };

  const decrementFooter = () => {
    if (footerRows > 0) {
      onFooterRowsChange(footerRows - 1);
    }
  };

  return (
    <div 
      className="fixed z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div 
        ref={dialogRef}
        className="bg-white border border-gray-300 rounded-lg shadow-xl"
        style={{ width: '360px' }}
      >
        {/* 标题栏 - 可拖动区域 */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50"
          onMouseDown={handleMouseDown}
          style={{ cursor: 'move' }}
        >
          <h3 className="text-lg font-bold text-gray-800">表头和表尾</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="no-drag w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-4">
          {/* 说明文字 */}
          <p className="text-sm text-gray-600">
            如果打印时表格被分页，表头表尾会出现在每一页的表格上
          </p>

          {/* 预览表格 - 5行 */}
          <div className="border rounded p-2 bg-gray-50">
            <table className="w-full border-collapse">
              <tbody>
                {[0, 1, 2, 3, 4].map((rowIndex) => {
                  const isHeader = rowIndex < headerRows;
                  const isFooter = rowIndex >= 5 - footerRows;
                  
                  return (
                    <tr key={rowIndex}>
                      {[0, 1, 2].map((colIndex) => (
                        <td
                          key={colIndex}
                          className={`border border-gray-300 p-1 h-6 ${
                            isHeader ? 'bg-gray-100' : isFooter ? 'bg-gray-100' : 'bg-white'
                          }`}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 表头行和表尾行设置 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 表头行 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表头行
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 border border-gray-300"
                  onClick={decrementHeader}
                  disabled={headerRows <= 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className={`h-8 w-12 flex items-center justify-center rounded text-sm font-medium ${
                  headerRows > 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {headerRows}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 border border-gray-300"
                  onClick={incrementHeader}
                  disabled={headerRows >= Math.min(2, maxRows)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 表尾行 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表尾行
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 border border-gray-300"
                  onClick={decrementFooter}
                  disabled={footerRows <= 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className={`h-8 w-12 flex items-center justify-center rounded text-sm font-medium ${
                  footerRows > 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {footerRows}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 border border-gray-300"
                  onClick={incrementFooter}
                  disabled={footerRows >= Math.min(2, maxRows)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 限制说明 */}
          <div className="text-sm text-gray-600">
            <p className="mb-1 font-medium">以下情况，无法设置表头表尾</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>表头表尾设置的总行数大于表格总行数</li>
              <li>行内包含循环字段区域</li>
              <li>行内包含与其他行的合并单元格</li>
            </ul>
          </div>

          {/* 帮助按钮 */}
          <div className="flex justify-start">
            <Button variant="ghost" size="sm" className="text-sm text-gray-500">
              <HelpCircle className="w-4 h-4 mr-1" />
              帮助
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
