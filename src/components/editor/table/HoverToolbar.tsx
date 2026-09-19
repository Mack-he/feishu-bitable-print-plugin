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
      <div className="flex items-center gap-0.5 rounded-xl border bg-popover px-1 py-1 text-popover-foreground shadow-lg">
        {/* 编辑按钮 */}
        <button
          type="button"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-primary px-2 text-xs font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={handleEditClick}
          title="编辑表格"
        >
          <Pencil className="w-3.5 h-3.5" />
          编辑
        </button>
        
        {/* 分隔线 */}
        <div className="mx-1 h-4 w-px bg-border" />
        
        {/* 操作按钮：从右到左排列 */}
        {/* 隐藏按钮（禁用） */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-muted-foreground"
          disabled
          title="隐藏"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
        
        {/* 复制按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground"
          onClick={handleCopyClick}
          title="复制"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        
        {/* 组件属性按钮（禁用） */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-muted-foreground"
          disabled
          title="组件属性"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
        
        {/* 删除按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDeleteClick}
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});

HoverToolbar.displayName = 'HoverToolbar';
