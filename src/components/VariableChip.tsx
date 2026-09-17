'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComponentTextStyle } from '@/types/editor';

interface VariableChipProps {
  fieldName: string;
  value: string;
  className?: string;
  textStyle?: Partial<ComponentTextStyle>;
}

/**
 * 动态变量芯片组件
 * 显示带样式的变量值，并显示字段名提示
 * 支持继承父组件的文本样式（字体大小、颜色、加粗等）
 */
export const VariableChip: React.FC<VariableChipProps> = ({
  fieldName,
  value,
  className = '',
  textStyle,
}) => {
  // 构建样式对象，继承父组件的文本样式
  const chipStyle: React.CSSProperties = {
    fontSize: textStyle?.fontSize ? `${textStyle.fontSize}px` : undefined,
    fontWeight: textStyle?.bold ? 'bold' : undefined,
    fontStyle: textStyle?.italic ? 'italic' : undefined,
    color: textStyle?.color || undefined,
    backgroundColor: textStyle?.backgroundColor || undefined,
    textAlign: textStyle?.align || undefined,
    lineHeight: textStyle?.lineHeight || undefined,
    textDecoration: textStyle?.underline ? 'underline' : textStyle?.textDecoration || undefined,
    textTransform: textStyle?.textTransform || undefined,
  };

  return (
    <span
      className={`
        inline-flex items-center
        text-blue-700
        text-sm font-medium
        cursor-default
        select-none
        ${className}
      `}
      style={chipStyle}
      data-field-name={fieldName}
      title={`字段：${fieldName}`}
    >
      {value}
    </span>
  );
};

/**
 * 带工具提示的变量芯片组件
 */
export const VariableChipWithTooltip: React.FC<VariableChipProps> = ({
  fieldName,
  value,
  className = '',
  textStyle,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <VariableChip
          fieldName={fieldName}
          value={value}
          className={className}
          textStyle={textStyle}
        />
      </TooltipTrigger>
      <TooltipContent>
        字段：{fieldName}
      </TooltipContent>
    </Tooltip>
  );
};

export default VariableChip;
