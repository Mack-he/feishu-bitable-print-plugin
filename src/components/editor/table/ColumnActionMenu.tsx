'use client';

import React from 'react';

interface ColumnActionMenuProps {
  onAddLeft: () => void;
  onAddRight: () => void;
  onDelete: () => void;
  position?: 'top' | 'bottom';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const ColumnActionMenu: React.FC<ColumnActionMenuProps> = ({
  onAddLeft,
  onAddRight,
  onDelete,
  position = 'bottom',
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div 
      className={`absolute left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-md shadow-lg p-1 flex flex-row gap-0.5 z-30 ${
        position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onAddLeft}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="在左侧插入列"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 5v14M5 12h10" />
        </svg>
        <span>左插列</span>
      </button>
      
      <button
        onClick={onAddRight}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="在右侧插入列"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5v14M19 12h-10" />
        </svg>
        <span>右插列</span>
      </button>
      
      <div className="w-px bg-gray-200 mx-0.5" />
      
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
        title="删除此列"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>删除列</span>
      </button>
    </div>
  );
};

ColumnActionMenu.displayName = 'ColumnActionMenu';
