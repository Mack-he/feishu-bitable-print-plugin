'use client';

import React, { useState, useRef } from 'react';
import { Pencil, X, Type } from 'lucide-react';

interface TextVariableTagProps {
  fieldName: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * 普通文本字段变量标签组件
 * 编辑状态下显示为 [字段名] 格式的标签，支持悬停编辑/删除
 */
export const TextVariableTag: React.FC<TextVariableTagProps> = ({
  fieldName,
  isEditing = false,
  onEdit,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowActions(false);
    }, 300);
  };

  // 非编辑状态只显示字段值（由父组件控制）
  if (!isEditing) {
    return <span>{`{{${fieldName}}}`}</span>;
  }

  return (
    <span
      className="relative inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded bg-blue-100 text-blue-800 text-sm font-medium cursor-pointer hover:bg-blue-200 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.();
      }}
      title={`文本字段：${fieldName}（双击编辑）`}
    >
      <Type className="w-3 h-3" />
      <span>[{fieldName}]</span>
      
      {/* 悬浮操作按钮 */}
      {showActions && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded-md shadow-lg z-[60]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="编辑"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <span className="w-px h-3 bg-gray-300" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </span>
  );
};

export default TextVariableTag;
