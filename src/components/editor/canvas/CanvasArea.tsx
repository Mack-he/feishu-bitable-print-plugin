'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, ComponentType, CanvasComponentNode } from '@/types/editor';
import { Plus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { InsertionIndicator } from './InsertionIndicator';
import { SortableItem } from './SortableItem';
import { FloatingAddButton } from './FloatingAddButton';
import { Button } from '@/components/ui/button';

// 插入位置类型
type InsertPosition = 'top' | 'bottom' | null;

// 获取组件宽度类名
function getComponentWidthClass(width: string) {
  switch (width) {
    case '50%': return 'w-1/2';
    case '33%': return 'w-1/3';
    case '25%': return 'w-1/4';
    default: return 'w-full';
  }
}

// 获取组件宽度样式 - 修复：使用 calc 更精确，确保 box-sizing 正确
function getComponentWidthStyle(width: string, containerWidth: number) {
  const gap = 12; // gap-3 = 12px
  switch (width) {
    case '50%': 
      return { 
        width: `calc((100% - ${gap}px) / 2)`,
        flexShrink: 0,
        boxSizing: 'border-box' as const,
      };
    case '33%': 
      return { 
        width: `calc((100% - ${2 * gap}px) / 3)`,
        flexShrink: 0,
        boxSizing: 'border-box' as const,
      };
    case '25%': 
      return { 
        width: `calc((100% - ${3 * gap}px) / 4)`,
        flexShrink: 0,
        boxSizing: 'border-box' as const,
      };
    default: 
      return { 
        width: '100%',
        flexShrink: 0,
        boxSizing: 'border-box' as const,
      };
  }
}

export function CanvasArea() {
  const {
    components,
    pageConfig,
    styleConfig,
    selectComponent,
    selectedComponentId,
    addComponent,
    deleteComponent,
    reorderComponents,
    updateComponent,
  } = useEditorStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [insertPosition, setInsertPosition] = useState<InsertPosition>(null);
  const [isFromPanel, setIsFromPanel] = useState(false);
  const [dragType, setDragType] = useState<ComponentType | null>(null);
  
  // 缩放状态
  const [scale, setScale] = useState(1);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 传感器设置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;
  
  const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;
  const contentHeight = canvasHeight - (pageConfig.margins.top + pageConfig.margins.bottom) * mmToPx;

  // 找到正在拖拽的组件数据
  const activeComponent = isFromPanel 
    ? null 
    : components.find((c) => c.id === activeId);



  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // 判断是否从侧边栏拖拽过来
    const isNewComponent = active.data.current?.isFromPanel === true;
    setIsFromPanel(isNewComponent);
    
    if (isNewComponent && active.data.current?.type) {
      setDragType(active.data.current.type as ComponentType);
    } else {
      setDragType(null);
    }
    
    setOverId(null);
    setInsertPosition(null);
  };

  // 拖拽过程
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setOverId(null);
      setInsertPosition(null);
      return;
    }

    // 如果拖拽到画布本身
    if (over.id === 'canvas' || over.id === 'canvas-grid') {
      setOverId(null);
      setInsertPosition(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr === overIdStr) {
      setOverId(null);
      setInsertPosition(null);
      return;
    }

    setOverId(overIdStr);
    setInsertPosition('bottom'); // 默认插入到下方
  };

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (isFromPanel && dragType) {
      // ========== 从侧边栏新增组件 ==========
      if (over && over.id !== 'canvas' && over.id !== 'canvas-grid') {
        const targetId = over.id as string;
        const targetIndex = components.findIndex(c => c.id === targetId);
        const targetComponent = components.find(c => c.id === targetId);
        
        if (targetIndex !== -1 && targetComponent) {
          // 1. 先添加新组件到末尾
          const tempId = addComponent(dragType);
          
          // 2. 延迟处理位置和宽度
          setTimeout(() => {
            const state = useEditorStore.getState();
            const newComponents = state.components;
            const newComponent = newComponents.find(c => c.id === tempId);
            
            if (newComponent) {
              const newComponentIndex = newComponents.findIndex(c => c.id === tempId);
              
              // 关键逻辑：判断目标组件宽度
              const isTargetFullWidth = targetComponent.layout?.width === '100%' || !targetComponent.layout;
              
              if (isTargetFullWidth) {
                // 并排模式：两个都变为50%
                state.updateComponent(tempId, { layout: { width: '50%' } });
                state.updateComponent(targetId, { layout: { width: '50%' } });
                state.reorderComponents(newComponentIndex, targetIndex + 1);
              } else {
                // 插入到下方
                state.reorderComponents(newComponentIndex, targetIndex + 1);
              }
            }
          }, 50);
        }
      } else {
        // 直接添加到末尾
        addComponent(dragType);
      }
    } else if (over && active.id !== over.id) {
      // ========== 重新排序现有组件 ==========
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderComponents(oldIndex, newIndex);
      }
    }

    setActiveId(null);
    setOverId(null);
    setInsertPosition(null);
    setIsFromPanel(false);
    setDragType(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectComponent(null);
    }
  };

  const handleAddClick = () => {
    addComponent('text');
  };

  const handleAddComponent = (type: ComponentType) => {
    addComponent(type);
  };

  const handleDeleteComponent = (id: string) => {
    deleteComponent(id);
  };

  return (
    <div className="flex flex-col items-start" style={{ minWidth: 'min-content' }}>  {/* 改为 items-start，避免内容被居中裁剪 */}
      {/* 缩放控制栏 - 背景透明，宽度自适应，居中显示 */}
      <div className="w-full flex justify-center mb-4">
        <div className="flex items-center gap-2 bg-transparent rounded-lg p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="h-8 w-8 bg-white/80 hover:bg-white shadow-sm border"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center bg-white/80 px-3 py-1.5 rounded-md shadow-sm border">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 2}
            className="h-8 w-8 bg-white/80 hover:bg-white shadow-sm border"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetZoom}
            className="h-8 w-8 bg-white/80 hover:bg-white shadow-sm border"
            title="重置缩放"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 画布容器 - 确保宽度能容纳原始尺寸的画布 */}
      <div 
        ref={canvasContainerRef}
        className="flex items-start justify-start"
        style={{ 
          minWidth: `${canvasWidth}px`,  // 【关键】确保最小宽度等于画布原始宽度
          overflow: 'auto',  // 允许滚动
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            id="canvas"
            className="bg-white shadow-lg relative transition-transform origin-top-left"
            style={{
              width: `${canvasWidth}px`,
              minHeight: `${canvasHeight}px`,
              padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
              fontFamily: styleConfig.fontFamily,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              willChange: 'transform',
            }}
            onClick={handleCanvasClick}
          >
            {/* 使用 flex-wrap 实现并排 - 修复：添加 overflowX visible 防止内容截断 */}
            <div
              id="canvas-grid"
              className="flex flex-wrap content-start gap-3"
              style={{ 
                width: `${contentWidth}px`,
                minHeight: `${contentHeight}px`,
                overflowX: 'visible',
                boxSizing: 'border-box',
              }}
            >
              <SortableContext
                items={components.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {components.length > 0 ? (
                  components.map((component) => {
                    const isTarget = overId === component.id;
                    const isActive = activeId === component.id;
                    const layoutWidth = component.layout?.width || '100%';

                    return (
                      <React.Fragment key={component.id}>
                        {/* 插入指示器 */}
                        {isTarget && !isActive && insertPosition && (
                          <div className="w-full flex-shrink-0">
                            <InsertionIndicator type="horizontal" />
                          </div>
                        )}

                        <div
                          style={{
                            ...getComponentWidthStyle(layoutWidth, contentWidth),
                            boxSizing: 'border-box',
                          }}
                        >
                          <div data-component-id={component.id}>
                            <SortableItem
                              id={component.id}
                              component={component}
                              isSelected={selectedComponentId === component.id}
                              onSelect={() => selectComponent(component.id)}
                              onDelete={() => handleDeleteComponent(component.id)}
                              opacity={isActive ? 0.4 : 1}
                              onResize={(width) => {
                                updateComponent(component.id, { 
                                  layout: { width } 
                                });
                              }}
                            />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                ) : (
                  /* 空状态 */
                  <div
                    className="flex flex-col items-center justify-center text-muted-foreground w-full"
                    style={{ minHeight: `${contentHeight}px` }}
                  >
                    <div
                      className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      onClick={handleAddClick}
                    >
                      <Plus className="w-6 h-6" />
                    </div>
                    <p className="text-sm">从左侧拖拽组件开始排版</p>
                    <p className="text-xs mt-1">或点击上方 + 添加文本</p>
                    <p className="text-xs mt-2 text-primary">💡 拖新组件到100%宽度组件旁会自动并排为50%</p>
                  </div>
                )}
              </SortableContext>
            </div>

            {/* 悬浮添加按钮 */}
            <FloatingAddButton onAddComponent={handleAddComponent} />
          </div>

          {/* 拖拽时的覆盖层 */}
          <DragOverlay>
            {activeComponent ? (
              <div className="bg-white shadow-lg border-2 border-primary rounded-lg p-4 opacity-90">
                <p className="text-sm font-medium">
                  {activeComponent.type === 'text' && '文本组件'}
                  {activeComponent.type === 'heading' && '标题组件'}
                  {activeComponent.type === 'paragraph' && '段落组件'}
                  {activeComponent.type === 'list' && '列表组件'}
                  {activeComponent.type === 'table' && '表格组件'}
                  {activeComponent.type === 'image' && '图片组件'}
                  {activeComponent.type === 'qrcode' && '二维码'}
                  {activeComponent.type === 'barcode' && '条形码'}
                  {activeComponent.type === 'line' && '分隔线'}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
