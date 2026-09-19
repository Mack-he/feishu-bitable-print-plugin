'use client';

import React from 'react';
import {
  ChevronDown,
  Grid,
  Square,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type BorderType = 'left' | 'right' | 'top' | 'bottom' | 'all' | 'outer' | 'none';

interface BorderSettingsPanelProps {
  borderWidth: number;
  onBorderChange: (borderType: BorderType) => void;
  onBorderWidthChange: (width: number) => void;
}

// 边框选项
const BORDER_OPTIONS = [
  { type: 'left' as BorderType, label: '左边框', icon: 'left' },
  { type: 'right' as BorderType, label: '右边框', icon: 'right' },
  { type: 'top' as BorderType, label: '上边框', icon: 'top' },
  { type: 'bottom' as BorderType, label: '下边框', icon: 'bottom' },
  { type: 'all' as BorderType, label: '全边框', icon: 'all' },
  { type: 'outer' as BorderType, label: '外边框', icon: 'outer' },
  { type: 'none' as BorderType, label: '无边框', icon: 'none' },
];

// 边框粗细选项
const BORDER_WIDTHS = Array.from({ length: 50 }, (_, i) => i + 1);

// 边框图标组件
const BorderIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'left':
      return <div className="h-3.5 w-3.5 rounded-[3px] border border-dashed border-foreground/40 border-l-2 border-l-foreground/80" />;
    case 'right':
      return <div className="h-3.5 w-3.5 rounded-[3px] border border-dashed border-foreground/40 border-r-2 border-r-foreground/80" />;
    case 'top':
      return <div className="h-3.5 w-3.5 rounded-[3px] border border-dashed border-foreground/40 border-t-2 border-t-foreground/80" />;
    case 'bottom':
      return <div className="h-3.5 w-3.5 rounded-[3px] border border-dashed border-foreground/40 border-b-2 border-b-foreground/80" />;
    case 'all':
      return <Grid className="h-4 w-4" />;
    case 'outer':
      return <Square className="h-4 w-4" />;
    case 'none':
      return (
        <div className="relative h-4 w-4">
          <Square className="h-4 w-4 opacity-30" />
          <X className="absolute left-0 top-0 h-4 w-4 text-destructive" />
        </div>
      );
    default:
      return null;
  }
};

export const BorderSettingsPanel: React.FC<BorderSettingsPanelProps> = ({
  borderWidth,
  onBorderChange,
  onBorderWidthChange,
}) => {
  return (
    <div className="w-full">
      {/* 边框选项 */}
      <div className="space-y-0.5">
        {BORDER_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => onBorderChange(option.type)}
            className={cn(
              'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-xs transition-colors',
              'text-foreground/80 hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            )}
          >
            <BorderIcon type={option.icon} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <div className="my-1.5 h-px bg-border" />

      {/* 边框粗细 */}
      <div className="flex h-8 items-center justify-between pl-2">
        <span className="text-xs text-foreground/80">粗细</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs tabular-nums transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              )}
            >
              {borderWidth}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 w-16">
            {BORDER_WIDTHS.map((width) => (
              <DropdownMenuItem
                key={width}
                onSelect={() => onBorderWidthChange(width)}
                className={cn(
                  'justify-center tabular-nums',
                  width === borderWidth && 'bg-primary/10 font-semibold text-primary',
                )}
              >
                {width}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
