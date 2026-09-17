'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasComponentNode } from '@/types/editor';

interface ComponentWrapperProps {
  id: string;
  component: CanvasComponentNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function ComponentWrapper({
  id,
  component,
  isSelected,
  onSelect,
  onDelete,
  children,
}: ComponentWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group
        transition-all duration-200
        ${isSelected ? 'ring-1 ring-primary' : ''}
        ${!isSelected ? 'hover:ring-1 hover:ring-gray-300' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 拖拽手柄和操作栏 - 仅在选中或hover时显示 */}
      <div className={`
        absolute -left-16 top-0 flex flex-col items-center gap-1
        transition-opacity duration-200
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}>
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className="
            p-1.5 rounded-md cursor-grab active:cursor-grabbing
            bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700
            transition-colors
          "
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* 删除按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="
            w-8 h-8
            bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700
            transition-colors
          "
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 组件内容 */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
