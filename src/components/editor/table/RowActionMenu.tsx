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
      className={`absolute top-1/2 -translate-y-1/2 w-max bg-popover text-popover-foreground border rounded-xl shadow-lg p-1 flex flex-col gap-0.5 z-30 ${
        position === 'left' ? 'right-full mr-1' : 'left-full ml-1'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onAddAbove}
        className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        title="在上方插入行"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14M12 5v10" />
        </svg>
        <span>上插行</span>
      </button>
      
      <button
        onClick={onAddBelow}
        className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        title="在下方插入行"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 14h14M12 19v-10" />
        </svg>
        <span>下插行</span>
      </button>
      
      <div className="mx-1 my-0.5 h-px shrink-0 bg-border" />
      
      <button
        onClick={onDelete}
        className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
        title="删除此行"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>删除行</span>
      </button>
    </div>
  );
};

RowActionMenu.displayName = 'RowActionMenu';
