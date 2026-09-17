'use client';

import React from 'react';

interface RowActionMenuProps {
  onAddAbove: () => void;
  onAddBelow: () => void;
  onDelete: () => void;
  position?: 'left' | 'right';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const RowActionMenu: React.FC<RowActionMenuProps> = ({
  onAddAbove,
  onAddBelow,
  onDelete,
  position = 'right',
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div 
      className={`absolute top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-md shadow-lg p-1 flex flex-col gap-0.5 z-30 ${
        position === 'left' ? 'right-full mr-1' : 'left-full ml-1'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onAddAbove}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="在上方插入行"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14M12 5v10" />
        </svg>
        <span>上插行</span>
      </button>
      
      <button
        onClick={onAddBelow}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="在下方插入行"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 14h14M12 19v-10" />
        </svg>
        <span>下插行</span>
      </button>
      
      <div className="h-px bg-gray-200 my-0.5" />
      
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
        title="删除此行"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>删除行</span>
      </button>
    </div>
  );
};

RowActionMenu.displayName = 'RowActionMenu';
