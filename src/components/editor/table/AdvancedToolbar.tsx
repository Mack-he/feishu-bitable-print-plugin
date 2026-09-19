'use client';

import React, { useState } from 'react';
import {
  Palette,
  Grid,
  Check as CheckIcon,
  Merge,
  Split,
  PanelTop,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToolbarShell, ToolbarGroup, ToolbarDivider, ToolbarButton } from '../ToolbarKit';
import { BorderSettingsPanel } from './BorderSettingsPanel';
import { AlignmentSettingsPanel } from './AlignmentSettingsPanel';

interface AdvancedToolbarProps {
  onMergeCells: () => void;
  onUnmergeCells: () => void;
  selectedCellCount: number;
  hasMergedCell: boolean;
  onOpenHeaderFooterDialog: () => void;
  onBorderChange: (borderType: string) => void;
  onBorderWidthChange: (width: number) => void;
  borderWidth: number;
  onAlignmentChange: (align: 'top' | 'middle' | 'bottom') => void;
  verticalAlign: 'top' | 'middle' | 'bottom';
  onColorChange: (colorType: 'text' | 'fill', color: string) => void;
  onFinishEdit: () => void;
  /** 并入外部工具栏外壳时使用，不再自绘描边与投影 */
  embedded?: boolean;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({
  onMergeCells,
  onUnmergeCells,
  selectedCellCount,
  hasMergedCell,
  onOpenHeaderFooterDialog,
  onBorderChange,
  onBorderWidthChange,
  borderWidth,
  onAlignmentChange,
  verticalAlign,
  onColorChange,
  onFinishEdit,
  embedded = false,
}) => {
  const [showBorderPanel, setShowBorderPanel] = useState(false);

  return (
    <ToolbarShell variant={embedded ? 'plain' : 'panel'}>
      {/* 完成编辑：表格编辑的收尾动作，作为工具条的视觉锚点 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onFinishEdit();
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40"
        title="完成编辑"
      >
        <CheckIcon className="h-3.5 w-3.5" />
        完成
      </button>

      <ToolbarDivider />

      {/* 合并单元格 */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={onMergeCells}
          disabled={selectedCellCount < 2}
          title={selectedCellCount < 2 ? '请选择两个及以上单元格' : '合并单元格'}
        >
          <Merge className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={onUnmergeCells}
          disabled={!hasMergedCell}
          title="取消合并单元格"
        >
          <Split className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* 表头表尾 */}
      <ToolbarButton onClick={onOpenHeaderFooterDialog} title="表头表尾">
        <PanelTop className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* 边框 */}
      <Popover open={showBorderPanel} onOpenChange={setShowBorderPanel}>
        <PopoverTrigger asChild>
          <ToolbarButton active={showBorderPanel} title="边框">
            <Grid className="h-4 w-4" />
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-1.5">
          <BorderSettingsPanel
            borderWidth={borderWidth}
            onBorderChange={(type) => {
              onBorderChange(type);
              setShowBorderPanel(false);
            }}
            onBorderWidthChange={onBorderWidthChange}
          />
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      {/* 垂直对齐 */}
      <AlignmentSettingsPanel
        verticalAlign={verticalAlign}
        onAlignmentChange={onAlignmentChange}
      />

      <ToolbarDivider />

      {/* 单元格颜色 */}
      <ToolbarButton
        onClick={() => onColorChange('text', '#000000')}
        title="单元格颜色"
      >
        <Palette className="h-4 w-4" />
      </ToolbarButton>
    </ToolbarShell>
  );
});

AdvancedToolbar.displayName = 'AdvancedToolbar';
