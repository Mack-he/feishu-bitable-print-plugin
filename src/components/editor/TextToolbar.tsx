'use client';

import React, { useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComponentTextStyle } from '@/types/editor';

interface TextToolbarProps {
  textStyle: ComponentTextStyle;
  onChange: (style: Partial<ComponentTextStyle>) => void;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
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

export function TextToolbar({
  textStyle,
  onChange,
  onIncreaseFontSize,
  onDecreaseFontSize,
}: TextToolbarProps) {
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
  }, [onChange]);

  // 颜色
  const setColor = useCallback((color: string) => {
    onChange({ color });
  }, [onChange]);

  // 背景色
  const setBackgroundColor = useCallback((color: string) => {
    onChange({ backgroundColor: color === 'transparent' ? undefined : color });
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
    const current = textStyle.lineHeight || 1.5;
    onChange({ lineHeight: Math.min(3, current + 0.1) });
  }, [textStyle.lineHeight, onChange]);

  const decreaseLineHeight = useCallback(() => {
    const current = textStyle.lineHeight || 1.5;
    onChange({ lineHeight: Math.max(1, current - 0.1) });
  }, [textStyle.lineHeight, onChange]);

  // 段后间距
  const increaseParagraphSpacing = useCallback(() => {
    const current = textStyle.paragraphSpacing || 0;
    onChange({ paragraphSpacing: Math.min(50, current + 2) });
  }, [textStyle.paragraphSpacing, onChange]);

  const decreaseParagraphSpacing = useCallback(() => {
    const current = textStyle.paragraphSpacing || 0;
    onChange({ paragraphSpacing: Math.max(0, current - 2) });
  }, [textStyle.paragraphSpacing, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-white border rounded-lg shadow-sm">
      {/* 字体大小 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDecreaseFontSize}
          title="减小字体"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 text-sm">
              <Type className="w-4 h-4 mr-1" />
              <span className="min-w-[40px]">{textStyle.fontSize}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="grid grid-cols-5 gap-1 p-1">
              {FONT_SIZES.map((size) => (
                <DropdownMenuItem
                key={size}
                onClick={() => setFontSize(size)}
                className="justify-center text-sm"
              >
                {size}
              </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onIncreaseFontSize}
          title="增大字体"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 文本样式 */}
      <div className="flex items-center gap-1">
        <Button
          variant={textStyle.bold ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={toggleBold}
          title="加粗"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.italic ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={toggleItalic}
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.underline ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={toggleUnderline}
          title="下划线"
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 颜色 */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="文字颜色">
              <Palette className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2">文字颜色</p>
              <div className="grid grid-cols-7 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColor(color)}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color, borderColor: textStyle.color === color ? '#000' : '#ddd' }}
                  />
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="背景颜色">
              <Highlighter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2">背景颜色</p>
              <div className="grid grid-cols-6 gap-1">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackgroundColor(color)}
                    className="w-6 h-6 rounded border"
                    style={{ 
                      backgroundColor: color === 'transparent' ? '#fff' : color, 
                      borderColor: textStyle.backgroundColor === color ? '#000' : '#ddd' 
                    }}
                  />
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 插入链接 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={insertLink}
        title="插入链接"
      >
        <Link2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 标题 */}
      <div className="flex items-center gap-1">
        <Button
          variant={textStyle.headingLevel === 1 ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setHeading(textStyle.headingLevel === 1 ? null : 1)}
          title="一级标题"
        >
          <Heading1 className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.headingLevel === 2 ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setHeading(textStyle.headingLevel === 2 ? null : 2)}
          title="二级标题"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 对齐 */}
      <div className="flex items-center gap-1">
        <Button
          variant={textStyle.align === 'left' ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setAlign('left')}
          title="左对齐"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.align === 'center' ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setAlign('center')}
          title="居中"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.align === 'right' ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setAlign('right')}
          title="右对齐"
        >
          <AlignRight className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.align === 'justify' ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setAlign('justify')}
          title="两端对齐"
        >
          <AlignJustify className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 列表 */}
      <div className="flex items-center gap-1">
        <Button
          variant={textStyle.listType === 'unordered' ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setListType(textStyle.listType === 'unordered' ? null : 'unordered')}
          title="无序列表"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          variant={textStyle.listType === 'ordered' ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setListType(textStyle.listType === 'ordered' ? null : 'ordered')}
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 更多选项 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="更多选项">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-3 space-y-4">
            {/* 行高 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">行高</span>
                <span className="text-xs text-muted-foreground">{textStyle.lineHeight || 1.5}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={decreaseLineHeight}
                  title="减小行高"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={textStyle.lineHeight || 1.5}
                  onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={increaseLineHeight}
                  title="增大行高"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* 段后间距 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">段后间距</span>
                <span className="text-xs text-muted-foreground">{textStyle.paragraphSpacing || 0}px</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={decreaseParagraphSpacing}
                  title="减小间距"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="2"
                  value={textStyle.paragraphSpacing || 0}
                  onChange={(e) => onChange({ paragraphSpacing: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={increaseParagraphSpacing}
                  title="增大间距"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
