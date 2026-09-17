import React, { useCallback } from 'react';
import { Trash2, Copy, EyeOff, Pencil, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoverToolbarProps {
  onEdit: (e?: React.MouseEvent) => void;
  onDelete: (e?: React.MouseEvent) => void;
  onCopy: (e?: React.MouseEvent) => void;
  isSelected?: boolean;
}

export const HoverToolbar: React.FC<HoverToolbarProps> = React.memo(({ onEdit, onDelete, onCopy, isSelected = false }) => {
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(e);
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(e);
  }, [onDelete]);

  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(e);
  }, [onCopy]);

  return (
    <div className={`transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center bg-white border rounded-md shadow-md px-1.5 py-1 gap-0.5">
        {/* 编辑按钮 */}
        <Button
          variant="default"
          size="icon"
          className="h-6 w-6 bg-blue-500 hover:bg-blue-600"
          onClick={handleEditClick}
          title="编辑表格"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        
        {/* 分隔线 */}
        <div className="w-px h-4 bg-gray-200" />
        
        {/* 操作按钮：从右到左排列 */}
        {/* 隐藏按钮（禁用） */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground"
          disabled
          title="隐藏"
        >
          <EyeOff className="w-3 h-3" />
        </Button>
        
        {/* 复制按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleCopyClick}
          title="复制"
        >
          <Copy className="w-3 h-3" />
        </Button>
        
        {/* 组件属性按钮（禁用） */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground"
          disabled
          title="组件属性"
        >
          <Settings className="w-3 h-3" />
        </Button>
        
        {/* 删除按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-destructive hover:text-destructive"
          onClick={handleDeleteClick}
          title="删除"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});

HoverToolbar.displayName = 'HoverToolbar';
