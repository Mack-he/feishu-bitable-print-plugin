'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasComponentNode } from '@/types/editor';
import { CanvasComponent } from './CanvasComponent';
import { useEditorStore } from '@/store/editorStore';
import { useRef } from 'react';

interface SortableItemProps {
  id: string;
  component: CanvasComponentNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  opacity?: number;
  onResize?: (width: '100%' | '50%' | '33%' | '25%') => void;
}

const WIDTH_OPTIONS: ('100%' | '50%' | '33%' | '25%')[] = ['100%', '50%', '33%', '25%'];

export function SortableItem({
  id,
  component,
  isSelected,
  onSelect,
  onDelete,
  opacity = 1,
  onResize,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // 获取表格编辑状态
  const tableEditing = useEditorStore((state) => state.tableEditing);
  
  // 检查当前表格是否处于编辑状态
  const isTableEditing = tableEditing.isEditing && tableEditing.tableId === component.id;

  // 用于检测双击的 ref
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : opacity,
    zIndex: isDragging ? 999 : 'auto',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  // 处理点击，防止双击时触发两次选中
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 表格编辑状态下不触发选中
    if (isTableEditing) return;
    
    clickCountRef.current += 1;
    
    if (clickCountRef.current === 1) {
      // 第一次点击，设置定时器
      clickTimeoutRef.current = setTimeout(() => {
        // 如果300ms内没有第二次点击，则触发选中
        if (clickCountRef.current === 1) {
          onSelect();
        }
        clickCountRef.current = 0;
      }, 300);
    } else if (clickCountRef.current === 2) {
      // 第二次点击（双击），清除定时器，不触发选中
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      clickCountRef.current = 0;
    }
  };

  // 获取当前宽度索引
  const currentWidth = component.layout?.width || '100%';
  const currentIndex = WIDTH_OPTIONS.indexOf(currentWidth as any);

  // 调整宽度 - 缩小
  const handleShrink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < WIDTH_OPTIONS.length - 1) {
      onResize?.(WIDTH_OPTIONS[currentIndex + 1]);
    }
  };

  // 调整宽度 - 放大
  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      onResize?.(WIDTH_OPTIONS[currentIndex - 1]);
    }
  };

  // 是否允许调整
  const canShrink = currentIndex < WIDTH_OPTIONS.length - 1;
  const canExpand = currentIndex > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group
        transition-all duration-200
        ${isSelected ? 'ring-1 ring-primary' : ''}
        ${!isSelected && !isDragging ? 'hover:ring-1 hover:ring-gray-300' : ''}
      `}
      onClick={handleClick}
    >
      {/* 左侧操作栏 - 拖拽手柄和删除按钮 - 仅在非编辑状态下显示 */}
      {!isTableEditing && (
        <div className={`
          absolute -left-14 top-0 flex flex-col items-center gap-1
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
              h-8 w-8
              bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700
              transition-colors
            "
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 右侧操作栏 - 尺寸调整 - 仅在非编辑状态下显示 */}
      {!isTableEditing && onResize && (
        <div className={`
          absolute -right-14 top-0 flex flex-col items-center gap-1
          transition-opacity duration-200
          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}>
          {/* 放大按钮 */}
          <Button
            variant="ghost"
            size="icon"
            disabled={!canExpand}
            className="
              h-8 w-8
              bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700
              transition-colors disabled:opacity-30
            "
            onClick={handleExpand}
            title="扩大宽度"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* 当前宽度指示 */}
          <div className="text-xs text-gray-500 font-medium py-1">
            {currentWidth}
          </div>

          {/* 缩小按钮 */}
          <Button
            variant="ghost"
            size="icon"
            disabled={!canShrink}
            className="
              h-8 w-8
              bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700
              transition-colors disabled:opacity-30
            "
            onClick={handleShrink}
            title="缩小宽度"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 组件内容 */}
      <div className="w-full">
        <CanvasComponent
          component={component}
          isSelected={isSelected}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
