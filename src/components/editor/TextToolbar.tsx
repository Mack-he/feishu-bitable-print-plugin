'use client';

import React, { useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Link2,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Minus,
  Plus,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
  ToolbarShell,
  ToolbarGroup,
  ToolbarDivider,
  ToolbarButton,
  ColorSwatchGrid,
} from './ToolbarKit';
import { ComponentTextStyle } from '@/types/editor';
import { cn } from '@/lib/utils';

interface TextToolbarProps {
  textStyle: ComponentTextStyle;
  onChange: (style: Partial<ComponentTextStyle>) => void;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  /** 并入外部工具栏外壳时使用，不再自绘描边与投影 */
  embedded?: boolean;
}

// 字体大小选项
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

// 颜色选项
const COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#9900FF',
];

// 背景色选项
const BG_COLORS = [
  'transparent',
  '#FFF3CD', '#D1ECF1', '#D4EDDA', '#F8D7DA', '#E2E3E5',
];

const BG_COLOR_OPTIONS = BG_COLORS.map((color) => ({
  value: color,
  label: color === 'transparent' ? '无填充' : color,
}));

export function TextToolbar({
  textStyle,
  onChange,
  onIncreaseFontSize,
  onDecreaseFontSize,
  embedded = false,
}: TextToolbarProps) {
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const [textColorMenuOpen, setTextColorMenuOpen] = useState(false);
  const [bgColorMenuOpen, setBgColorMenuOpen] = useState(false);

  const lineHeight = textStyle.lineHeight || 1.5;
  const paragraphSpacing = textStyle.paragraphSpacing || 0;
  const textColor = textStyle.color || '#000000';

  // 加粗
  const toggleBold = useCallback(() => {
    onChange({ bold: !textStyle.bold });
  }, [textStyle.bold, onChange]);

  // 斜体
  const toggleItalic = useCallback(() => {
    onChange({ italic: !textStyle.italic });
  }, [textStyle.italic, onChange]);

  // 下划线
  const toggleUnderline = useCallback(() => {
    const newUnderline = !textStyle.underline;
    onChange({
      underline: newUnderline,
      textDecoration: newUnderline ? 'underline' : 'none'
    });
  }, [textStyle.underline, onChange]);

  // 对齐
  const setAlign = useCallback((align: ComponentTextStyle['align']) => {
    onChange({ align });
  }, [onChange]);

  // 字体大小
  const setFontSize = useCallback((size: number) => {
    onChange({ fontSize: size });
    setFontSizeMenuOpen(false);
  }, [onChange]);

  // 颜色
  const setColor = useCallback((color: string) => {
    onChange({ color });
    setTextColorMenuOpen(false);
  }, [onChange]);

  // 背景色
  const setBackgroundColor = useCallback((color: string) => {
    onChange({ backgroundColor: color === 'transparent' ? undefined : color });
    setBgColorMenuOpen(false);
  }, [onChange]);

  // 标题
  const setHeading = useCallback((level: 1 | 2 | null) => {
    onChange({ headingLevel: level });
  }, [onChange]);

  // 列表
  const setListType = useCallback((type: 'ordered' | 'unordered' | null) => {
    onChange({ listType: type });
  }, [onChange]);

  // 插入链接
  const insertLink = useCallback(() => {
    const url = prompt('请输入链接地址:', 'https://');
    if (url) {
      onChange({ linkUrl: url });
    }
  }, [onChange]);

  // 行高
  const increaseLineHeight = useCallback(() => {
    onChange({ lineHeight: Math.min(3, Math.round((lineHeight + 0.1) * 10) / 10) });
  }, [lineHeight, onChange]);

  const decreaseLineHeight = useCallback(() => {
    onChange({ lineHeight: Math.max(1, Math.round((lineHeight - 0.1) * 10) / 10) });
  }, [lineHeight, onChange]);

  // 段后间距
  const increaseParagraphSpacing = useCallback(() => {
    onChange({ paragraphSpacing: Math.min(50, paragraphSpacing + 2) });
  }, [paragraphSpacing, onChange]);

  const decreaseParagraphSpacing = useCallback(() => {
    onChange({ paragraphSpacing: Math.max(0, paragraphSpacing - 2) });
  }, [paragraphSpacing, onChange]);

  return (
    <ToolbarShell variant={embedded ? 'plain' : 'panel'}>
      {/* 字号：减 / 当前值 / 加 收在一个控件里 */}
      <ToolbarGroup className="h-8 items-center rounded-lg border px-0.5">
        <ToolbarButton
          className="h-7 w-7 rounded-md"
          onClick={onDecreaseFontSize}
          title="减小字号"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>

        <DropdownMenu open={fontSizeMenuOpen} onOpenChange={setFontSizeMenuOpen}>
          <DropdownMenuTrigger asChild>
            <ToolbarButton
              className="h-7 w-auto min-w-11 gap-0.5 rounded-md px-1.5"
              title="字号"
              aria-label="字号"
            >
              <span className="text-xs font-semibold tabular-nums">{textStyle.fontSize}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[172px] p-1.5">
            <div className="grid grid-cols-5 gap-0.5">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className={cn(
                    'h-8 rounded-lg text-xs tabular-nums transition-colors',
                    'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    size === textStyle.fontSize
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-foreground/80',
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarButton
          className="h-7 w-7 rounded-md"
          onClick={onIncreaseFontSize}
          title="增大字号"
        >
          <Plus className="h-3.5 w-3.5" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* 文本样式 */}
      <ToolbarGroup>
        <ToolbarButton active={textStyle.bold} onClick={toggleBold} title="加粗">
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton active={textStyle.italic} onClick={toggleItalic} title="斜体">
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton active={textStyle.underline} onClick={toggleUnderline} title="下划线">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* 颜色 */}
      <ToolbarGroup>
        <DropdownMenu open={textColorMenuOpen} onOpenChange={setTextColorMenuOpen}>
          <DropdownMenuTrigger asChild>
            <ToolbarButton title="文字颜色">
              <span className="relative flex h-8 w-8 items-center justify-center">
                <Palette className="h-4 w-4 -translate-y-[3px]" />
                <span
                  className="absolute bottom-1 left-1/2 h-[3px] w-3.5 -translate-x-1/2 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: textColor }}
                />
              </span>
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">文字颜色</p>
            <ColorSwatchGrid colors={COLORS.map((color) => ({ value: color }))} value={textColor} onChange={setColor} />
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={bgColorMenuOpen} onOpenChange={setBgColorMenuOpen}>
          <DropdownMenuTrigger asChild>
            <ToolbarButton title="背景颜色">
              <span className="relative flex h-8 w-8 items-center justify-center">
                <Highlighter className="h-4 w-4 -translate-y-[3px]" />
                <span
                  className="absolute bottom-1 left-1/2 h-[3px] w-3.5 -translate-x-1/2 rounded-full ring-1 ring-inset ring-black/10"
                  style={
                    textStyle.backgroundColor
                      ? { backgroundColor: textStyle.backgroundColor }
                      : { background: 'repeating-linear-gradient(45deg, #e5e5e5 0 2px, transparent 2px 4px)' }
                  }
                />
              </span>
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">背景颜色</p>
            <ColorSwatchGrid
              colors={BG_COLOR_OPTIONS}
              value={textStyle.backgroundColor || 'transparent'}
              onChange={setBackgroundColor}
              columns={6}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* 插入链接 */}
      <ToolbarButton onClick={insertLink} title="插入链接">
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* 段落：标题与列表 */}
      <ToolbarGroup>
        <ToolbarButton
          active={textStyle.headingLevel === 1}
          onClick={() => setHeading(textStyle.headingLevel === 1 ? null : 1)}
          title="一级标题"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={textStyle.headingLevel === 2}
          onClick={() => setHeading(textStyle.headingLevel === 2 ? null : 2)}
          title="二级标题"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={textStyle.listType === 'unordered'}
          onClick={() => setListType(textStyle.listType === 'unordered' ? null : 'unordered')}
          title="无序列表"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={textStyle.listType === 'ordered'}
          onClick={() => setListType(textStyle.listType === 'ordered' ? null : 'ordered')}
          title="有序列表"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* 对齐 */}
      <ToolbarGroup>
        <ToolbarButton
          active={textStyle.align === 'left'}
          onClick={() => setAlign('left')}
          title="左对齐"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={textStyle.align === 'center'}
          onClick={() => setAlign('center')}
          title="居中"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={textStyle.align === 'right'}
          onClick={() => setAlign('right')}
          title="右对齐"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={textStyle.align === 'justify'}
          onClick={() => setAlign('justify')}
          title="两端对齐"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* 更多：行高与段后间距 */}
      <Popover>
        <PopoverTrigger asChild>
          <ToolbarButton title="行高与段后间距">
            <MoreHorizontal className="h-4 w-4" />
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-4 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">行高</span>
              <span className="text-xs tabular-nums text-muted-foreground">{lineHeight.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ToolbarButton className="h-6 w-6 rounded-md" onClick={decreaseLineHeight} title="减小行高">
                <Minus className="h-3 w-3" />
              </ToolbarButton>
              <Slider
                className="flex-1"
                min={1}
                max={3}
                step={0.1}
                value={[lineHeight]}
                onValueChange={([value]) => onChange({ lineHeight: Math.round(value * 10) / 10 })}
              />
              <ToolbarButton className="h-6 w-6 rounded-md" onClick={increaseLineHeight} title="增大行高">
                <Plus className="h-3 w-3" />
              </ToolbarButton>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">段后间距</span>
              <span className="text-xs tabular-nums text-muted-foreground">{paragraphSpacing}px</span>
            </div>
            <div className="flex items-center gap-2">
              <ToolbarButton className="h-6 w-6 rounded-md" onClick={decreaseParagraphSpacing} title="减小间距">
                <Minus className="h-3 w-3" />
              </ToolbarButton>
              <Slider
                className="flex-1"
                min={0}
                max={50}
                step={2}
                value={[paragraphSpacing]}
                onValueChange={([value]) => onChange({ paragraphSpacing: value })}
              />
              <ToolbarButton className="h-6 w-6 rounded-md" onClick={increaseParagraphSpacing} title="增大间距">
                <Plus className="h-3 w-3" />
              </ToolbarButton>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </ToolbarShell>
  );
}
