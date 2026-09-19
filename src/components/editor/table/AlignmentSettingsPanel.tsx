'use client';

import React from 'react';
import { ArrowUpToLine, ArrowDownToLine, MoveVertical, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToolbarButton } from '../ToolbarKit';
import { cn } from '@/lib/utils';

type VerticalAlign = 'top' | 'middle' | 'bottom';

interface AlignmentSettingsPanelProps {
  verticalAlign: VerticalAlign;
  onAlignmentChange: (align: VerticalAlign) => void;
}

// 对齐选项
const ALIGNMENT_OPTIONS = [
  { value: 'top' as VerticalAlign, label: '顶部对齐', icon: ArrowUpToLine },
  { value: 'middle' as VerticalAlign, label: '垂直居中', icon: MoveVertical },
  { value: 'bottom' as VerticalAlign, label: '底部对齐', icon: ArrowDownToLine },
];

export const AlignmentSettingsPanel: React.FC<AlignmentSettingsPanelProps> = ({
  verticalAlign,
  onAlignmentChange,
}) => {
  const currentOption = ALIGNMENT_OPTIONS.find(opt => opt.value === verticalAlign);
  const CurrentIcon = currentOption?.icon || MoveVertical;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton title={`垂直对齐：${currentOption?.label ?? '垂直居中'}`}>
          <CurrentIcon className="h-4 w-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {ALIGNMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = option.value === verticalAlign;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onAlignmentChange(option.value)}
              className={cn(
                'gap-2 text-xs',
                selected && 'bg-primary/10 font-medium text-primary',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
              {selected && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
