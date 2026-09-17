'use client';

import React from 'react';
import { ArrowUpToLine, ArrowDownToLine, MoveVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          title="对齐"
        >
          <CurrentIcon className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALIGNMENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onAlignmentChange(option.value)}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
