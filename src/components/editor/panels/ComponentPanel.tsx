'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComponentType } from '@/types/editor';
import {
  Type,
  Table,
  Image,
  QrCode,
  BarChart3,
  Minus,
  Move,
  FileText,
  Table2,
  GripVertical,
  AlignLeft,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface ComponentPanelProps {
  onAddComponent: (type: ComponentType) => void;
}

// 组件定义
const components: {
  type: ComponentType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'basic' | 'code' | 'layout' | 'advanced';
}[] = [
  // 基础内容
  { type: 'text', name: '文本', icon: Type, description: '普通文本内容', category: 'basic' },
  { type: 'paragraph', name: '段落', icon: AlignLeft, description: '带首行缩进的段落', category: 'basic' },
  { type: 'table', name: '表格', icon: Table, description: '添加表格', category: 'basic' },
  { type: 'image', name: '图片', icon: Image, description: '添加图片', category: 'basic' },
  
  // 标识类
  { type: 'qrcode', name: '二维码', icon: QrCode, description: '生成二维码', category: 'code' },
  { type: 'barcode', name: '条形码', icon: BarChart3, description: '生成条形码', category: 'code' },
  
  // 布局
  { type: 'line', name: '水平线', icon: Minus, description: '添加分隔线', category: 'layout' },
  { type: 'freeElement', name: '自由拖动元素', icon: Move, description: '自由定位元素', category: 'layout' },
  
  // 高级
  { type: 'article', name: '文章区块', icon: FileText, description: '富文本区块', category: 'advanced' },
  { type: 'autoTable', name: '自动表格', icon: Table2, description: '自动生成表格', category: 'advanced' },
];

// 可拖拽组件项
function DraggableComponentItem({ 
  type, 
  name, 
  icon: Icon, 
  description,
  onAdd,
}: { 
  type: ComponentType; 
  name: string; 
  icon: React.ComponentType<{ className?: string }>; 
  description: string;
  onAdd: () => void;
}) {
  // 生成唯一的拖拽 ID
  const uniqueId = `panel-${type}-${Date.now()}`;
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: uniqueId,
    data: { type, isFromPanel: true },
  });

  return (
    <Card
      ref={setNodeRef}
      className={`p-3 cursor-pointer hover:border-primary hover:shadow-sm transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onAdd}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-muted-foreground cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
    </Card>
  );
}

export function ComponentPanel({ onAddComponent }: ComponentPanelProps) {
  // 按类别分组
  const categories = {
    basic: { name: '基础内容', items: components.filter(c => c.category === 'basic') },
    code: { name: '标识类', items: components.filter(c => c.category === 'code') },
    layout: { name: '布局', items: components.filter(c => c.category === 'layout') },
    advanced: { name: '高级内容', items: components.filter(c => c.category === 'advanced') },
  };

  return (
    <div className="p-3 space-y-4">
      {/* 标题和提示 */}
      <div>
        <h3 className="font-medium text-sm">组件</h3>
        <p className="text-xs text-muted-foreground mt-1">
          拖动到右侧页面开始排版
        </p>
      </div>

      {/* 组件列表 */}
      <div className="space-y-4">
        {Object.entries(categories).map(([key, category]) => (
          <div key={key}>
            <p className="text-xs text-muted-foreground mb-2">{category.name}</p>
            <div className="space-y-2">
              {category.items.map((item) => (
                <DraggableComponentItem
                  key={item.type}
                  type={item.type}
                  name={item.name}
                  icon={item.icon}
                  description={item.description}
                  onAdd={() => onAddComponent(item.type)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 快速指南 */}
      <div className="pt-3 border-t">
        <p className="text-xs font-medium mb-2">快速指南</p>
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
            如何创建新模板
          </Badge>
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted block mt-1">
            基本排版操作
          </Badge>
        </div>
      </div>
    </div>
  );
}
