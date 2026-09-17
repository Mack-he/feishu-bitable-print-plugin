'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  Grid, 
  Square, 
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
      return (
        <div className="w-4 h-4 border-l-2 border-black border-dashed" />
      );
    case 'right':
      return (
        <div className="w-4 h-4 border-r-2 border-black border-dashed" />
      );
    case 'top':
      return (
        <div className="w-4 h-4 border-t-2 border-black border-dashed" />
      );
    case 'bottom':
      return (
        <div className="w-4 h-4 border-b-2 border-black border-dashed" />
      );
    case 'all':
      return <Grid className="w-4 h-4" />;
    case 'outer':
      return <Square className="w-4 h-4" />;
    case 'none':
      return (
        <div className="w-4 h-4 relative">
          <Square className="w-4 h-4 opacity-30" />
          <X className="w-4 h-4 absolute top-0 left-0 text-red-500" />
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px]">
      {/* 边框选项 */}
      <div className="space-y-1">
        {BORDER_OPTIONS.map((option) => (
          <button
            key={option.type}
            className="w-full flex items-center gap-3 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
            onClick={() => onBorderChange(option.type)}
          >
            <BorderIcon type={option.icon} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <DropdownMenuSeparator className="my-2" />

      {/* 边框粗细设置 */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm text-gray-700">粗细</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 border border-blue-500 rounded">
              <span className="text-sm">{borderWidth}</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {BORDER_WIDTHS.map((width) => (
              <DropdownMenuItem
                key={width}
                onClick={() => onBorderWidthChange(width)}
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
