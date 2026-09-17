'use client';

import React from 'react';
import { CanvasComponentNode } from '@/types/editor';

// 文档组件渲染器属性
interface DocumentComponentRendererProps {
  component: CanvasComponentNode;
  isEditing: boolean;
  isSelected: boolean;
  onChange: (content: string) => void;
  onItemsChange?: (items: string[]) => void;
  onLevelChange?: (level: number) => void;
}

// 渲染标题组件
function HeadingComponent({ 
  component, 
  isEditing, 
  onChange, 
  onLevelChange 
}: DocumentComponentRendererProps & { component: any }) {
  const { content = '', level = 1, textStyle = {} } = component;
  
  const style: React.CSSProperties = {
    fontSize: textStyle.fontSize || (level === 1 ? 24 : level === 2 ? 20 : 18),
    fontWeight: textStyle.bold !== false ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'center',
    lineHeight: textStyle.lineHeight || 1.5,
    margin: '0 0 16px 0',
    padding: '8px 0',
  };

  const Tag = `h${level}` as const;
  const HeadingTag = Tag as unknown as React.FC<React.HTMLAttributes<HTMLHeadingElement>>;

  if (isEditing) {
    return (
      <div className="relative">
        <input
          type="text"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-0 outline-none bg-transparent"
          style={style}
          placeholder={`标题 H${level}`}
        />
        {/* 标题级别选择器 */}
        <div className="absolute -right-8 top-0 flex flex-col gap-1">
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              onClick={() => onLevelChange?.(lvl)}
              className={`w-6 h-6 text-xs rounded ${
                level === lvl 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              H{lvl}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 根据级别返回对应的标题元素
  const headingContent = content;
  const headingStyle = style;
  
  switch (level) {
    case 1:
      return <h1 style={headingStyle}>{headingContent}</h1>;
    case 2:
      return <h2 style={headingStyle}>{headingContent}</h2>;
    case 3:
      return <h3 style={headingStyle}>{headingContent}</h3>;
    case 4:
      return <h4 style={headingStyle}>{headingContent}</h4>;
    case 5:
      return <h5 style={headingStyle}>{headingContent}</h5>;
    case 6:
      return <h6 style={headingStyle}>{headingContent}</h6>;
    default:
      return <h1 style={headingStyle}>{headingContent}</h1>;
  }
}

// 渲染段落组件
function ParagraphComponent({ 
  component, 
  isEditing, 
  onChange 
}: DocumentComponentRendererProps & { component: any }) {
  const { content = '', indent = 2, textStyle = {} } = component;
  
  const style: React.CSSProperties = {
    fontSize: textStyle.fontSize || 14,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    textAlign: (textStyle.align as any) || 'justify',
    lineHeight: textStyle.lineHeight || 1.8,
    textIndent: `${indent * 2}em`, // 首行缩进
    margin: '0 0 12px 0',
    padding: '4px 0',
  };

  if (isEditing) {
    return (
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 outline-none resize-none bg-transparent"
        style={{
          ...style,
          minHeight: '60px',
        }}
        placeholder="输入段落内容..."
        rows={3}
      />
    );
  }

  // 处理换行
  const lines = content.split('\n');
  return (
    <p style={style}>
      {lines.map((line: string, index: number) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
}

// 渲染列表组件
function ListComponent({ 
  component, 
  isEditing, 
  onItemsChange 
}: DocumentComponentRendererProps & { component: any }) {
  const { items = [], listType = 'unordered', textStyle = {} } = component;
  
  const style: React.CSSProperties = {
    fontSize: textStyle.fontSize || 14,
    fontWeight: textStyle.bold ? 'bold' : 'normal',
    color: textStyle.color || '#000000',
    lineHeight: textStyle.lineHeight || 1.8,
    margin: '0 0 12px 0',
    paddingLeft: '2em',
  };

  const itemStyle: React.CSSProperties = {
    marginBottom: '4px',
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        {/* 列表类型切换 */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              // 通过更新组件来切换类型
            }}
            className={`px-3 py-1 text-xs rounded ${
              listType === 'unordered' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            ● 无序列表
          </button>
          <button
            onClick={() => {}}
            className={`px-3 py-1 text-xs rounded ${
              listType === 'ordered' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            1. 有序列表
          </button>
        </div>
        
        {/* 列表项编辑 */}
        <div style={style}>
          {items.map((item: string, index: number) => (
            <div key={index} className="flex items-start gap-2 mb-1">
              <span className="text-gray-500 select-none mt-1">
                {listType === 'ordered' ? `${index + 1}.` : '•'}
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.target.value;
                  onItemsChange?.(newItems);
                }}
                className="flex-1 border-0 outline-none bg-transparent"
                style={{
                  fontSize: textStyle.fontSize || 14,
                  lineHeight: textStyle.lineHeight || 1.8,
                }}
                placeholder={`列表项 ${index + 1}`}
              />
              <button
                onClick={() => {
                  const newItems = items.filter((_: string, i: number) => i !== index);
                  onItemsChange?.(newItems);
                }}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                删除
              </button>
            </div>
          ))}
        </div>
        
        {/* 添加列表项按钮 */}
        <button
          onClick={() => {
            onItemsChange?.([...items, '']);
          }}
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
        >
          + 添加列表项
        </button>
      </div>
    );
  }

  const ListTag = listType === 'ordered' ? 'ol' : 'ul';
  
  return (
    <ListTag style={style}>
      {items.map((item: string, index: number) => (
        <li key={index} style={itemStyle}>{item}</li>
      ))}
    </ListTag>
  );
}

// 主文档组件渲染器
export function DocumentComponentRenderer({
  component,
  isEditing,
  isSelected,
  onChange,
  onItemsChange,
  onLevelChange,
}: DocumentComponentRendererProps) {
  const type = component.type;

  switch (type) {
    case 'heading':
      return (
        <HeadingComponent
          component={component}
          isEditing={isEditing}
          isSelected={isSelected}
          onChange={onChange}
          onLevelChange={onLevelChange}
        />
      );
    case 'paragraph':
      return (
        <ParagraphComponent
          component={component}
          isEditing={isEditing}
          isSelected={isSelected}
          onChange={onChange}
        />
      );
    case 'list':
      return (
        <ListComponent
          component={component}
          isEditing={isEditing}
          isSelected={isSelected}
          onChange={onChange}
          onItemsChange={onItemsChange}
        />
      );
    default:
      return null;
  }
}

export default DocumentComponentRenderer;
