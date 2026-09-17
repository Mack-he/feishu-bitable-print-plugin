# 模板编辑状态 vs 排版打印预览状态 代码对比分析

## 📋 执行摘要

**问题现象**：模板编辑状态下组件正常显示，排版打印预览状态下组件溢出画布

**根本原因**：两个状态使用了完全不同的渲染机制和样式策略

---

## 一、模板编辑状态（正常）

### 1.1 核心文件与函数

| 层级 | 文件 | 关键函数/组件 | 作用 |
|------|------|--------------|------|
| 页面 | `page.tsx` | `EditorPage` | 编辑器主页面 |
| 画布容器 | `CanvasArea.tsx` | `CanvasArea` | 画布布局管理 |
| 组件包装 | `SortableItem.tsx` | `SortableItem` | 拖拽排序包装 |
| 组件渲染 | `CanvasComponent.tsx` | `CanvasComponent` | 组件内容渲染 |

### 1.2 渲染流程

```
EditorPage
  └── CanvasArea
        ├── DndContext (拖拽上下文)
        ├── canvas (画布容器 - 固定尺寸)
        │     └── canvas-grid (flex 布局容器)
        │           └── SortableItem (组件包装)
        │                 └── CanvasComponent (实际渲染)
        └── FloatingAddButton
```

### 1.3 关键样式策略

#### CanvasArea.tsx 画布容器
```tsx
// 画布尺寸计算
const canvasWidth = pageSize.width * mmToPx;  // A4: 210mm -> ~794px
const canvasHeight = pageSize.height * mmToPx; // A4: 297mm -> ~1123px
const contentWidth = canvasWidth - (margins.left + margins.right) * mmToPx;

// 画布容器样式
<div id="canvas" style={{
  width: `${canvasWidth}px`,        // 固定宽度
  minHeight: `${canvasHeight}px`,   // 最小高度
  padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
  transform: `scale(${scale})`,     // 缩放
}}>
  {/* 内容区域 */}
  <div id="canvas-grid" style={{ 
    width: `${contentWidth}px`,      // 内容区固定宽度
    minHeight: `${contentHeight}px`,
    overflowX: 'visible',            // 【关键】允许溢出可见
    boxSizing: 'border-box',
  }}>
```

#### 组件宽度计算
```tsx
function getComponentWidthStyle(width: string, containerWidth: number) {
  const gap = 12;
  switch (width) {
    case '50%': 
      return { 
        width: `calc((100% - ${gap}px) / 2)`,  // 精确计算
        flexShrink: 0,
        boxSizing: 'border-box',
      };
    // ... 其他比例
  }
}
```

#### CanvasComponent.tsx 文本组件样式
```tsx
// 编辑模式
<div style={{
  width: '100%',                    // 占满容器
  wordWrap: 'break-word',          // 允许单词内换行
  overflowWrap: 'anywhere',        // 激进换行
  maxWidth: '100%',                // 不超过父容器
  whiteSpace: 'pre-wrap',          // 保留换行
}}>

// 非编辑模式
<div style={{
  width: '100%',
  wordWrap: 'break-word',
  overflowWrap: 'anywhere',
  maxWidth: '100%',
  whiteSpace: 'pre-wrap',
}}>
```

### 1.4 布局特点

| 特性 | 实现方式 | 效果 |
|------|---------|------|
| 画布尺寸 | 固定像素 (mm转px) | 精确控制 |
| 组件布局 | flex-wrap + calc计算宽度 | 自动换行 |
| 溢出处理 | `overflowX: 'visible'` | 可见但可能滚动 |
| 文本换行 | `wordWrap: 'break-word'` | 自动换行 |
| 缩放 | CSS transform scale | 整体缩放 |

---

## 二、排版打印预览状态（异常）

### 2.1 核心文件与函数

| 层级 | 文件 | 关键函数/组件 | 作用 |
|------|------|--------------|------|
| 页面 | `TemplatePreview.tsx` | `TemplatePreview` | 预览主组件 |
| 组件渲染 | `TemplatePreview.tsx` | `renderComponent` | React组件渲染 |
| HTML渲染 | `TemplatePreview.tsx` | `renderComponentToHTML` | 打印HTML生成 |
| 打印预览 | `PrintPreviewDialog.tsx` | `PrintPreviewDialog` | 打印预览对话框 |
| 打印渲染 | `PrintPreviewDialog.tsx` | `PrintComponentRenderer` | 打印组件渲染 |

### 2.2 渲染流程

```
TemplatePreview
  └── 三种布局模式:
        ├── default (默认分页)
        │     └── renderDataPage
        │           └── renderComponent
        ├── continuous (连续排版)
        │     └── renderComponent
        └── label (标签布局)
              └── renderComponent
```

### 2.3 关键样式策略

#### TemplatePreview.tsx 容器样式
```tsx
// 页面容器
<div style={{
  width: `${actualWidth}mm`,       // 使用 mm 单位
  minHeight: `${actualHeight}mm`,
  padding,                         // 边距
  boxSizing: 'border-box',
}}>
  {/* 【关键问题】内容容器 */}
  <div style={{
    minWidth: 'max-content',       // ❌ 内容决定宽度！
    display: 'block',
    padding: '0',
    margin: '0',
  }}>
```

**⚠️ 问题1**: `minWidth: 'max-content'` 让容器宽度由内容决定，而不是由父容器限制！

#### renderComponent 组件样式
```tsx
const baseStyle: React.CSSProperties = {
  position: 'relative',
  width: component.layout?.width || '100%',
  flex: `0 0 ${component.layout?.width || '100%'}`,
  maxWidth: component.layout?.width || '100%',  // ❌ 使用组件自身宽度
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  overflow: 'visible',
  boxSizing: 'border-box',
};
```

**⚠️ 问题2**: `maxWidth` 使用组件自身的 `layout.width`，如果组件宽度是百分比，可能没有正确计算！

#### renderComponentToHTML 打印样式
```tsx
const styleStr = `
  position: relative;
  width: ${component.layout?.width || '100%'};
  flex: 0 0 ${component.layout?.width || '100%'};
  max-width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;              // ❌ 允许横向滚动
`;
```

**⚠️ 问题3**: `overflow-x: auto` 允许横向滚动，且 flex 布局可能导致问题

### 2.4 PrintPreviewDialog.tsx 样式

```tsx
// PrintComponentRenderer - 基础文本样式
const baseStyles: React.CSSProperties = {
  fontFamily: styleConfig.fontFamily,
  fontSize: `${textStyle.fontSize || styleConfig.fontSize}px`,
  width: '100%',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',      // ✅ 已添加
  maxWidth: '100%',              // ✅ 已添加
};
```

---

## 三、关键差异对比

### 3.1 容器宽度策略

| 特性 | 模板编辑状态 | 排版打印预览状态 | 问题 |
|------|-------------|-----------------|------|
| 宽度单位 | px (像素) | mm (毫米) | 单位不同 |
| 容器约束 | `width: ${contentWidth}px` | `minWidth: 'max-content'` | ❌ 预览态容器无约束 |
| 溢出处理 | `overflowX: 'visible'` | 未明确设置 | - |

### 3.2 组件宽度策略

| 特性 | 模板编辑状态 | 排版打印预览状态 | 问题 |
|------|-------------|-----------------|------|
| 宽度计算 | `calc((100% - gap) / n)` | `component.layout?.width` | 预览态可能无calc |
| flex-shrink | `flexShrink: 0` | `flex: 0 0 ${width}` | 相同 |
| max-width | 无（由父容器控制） | `maxWidth: component.layout?.width` | ❌ 可能使用百分比 |

### 3.3 文本换行策略

| 特性 | 模板编辑状态 | 排版打印预览状态 | 状态 |
|------|-------------|-----------------|------|
| wordWrap | `break-word` | `break-word` | ✅ 相同 |
| overflowWrap | `anywhere` | `break-word` | ⚠️ 略有不同 |
| whiteSpace | `pre-wrap` | `pre-wrap` | ✅ 相同 |
| maxWidth | `100%` | `100%` | ✅ 已修复 |

### 3.4 布局系统

| 特性 | 模板编辑状态 | 排版打印预览状态 | 问题 |
|------|-------------|-----------------|------|
| 布局方式 | flex-wrap | flex-wrap (print) / block (preview) | 不同 |
| 容器类型 | 固定px | mm + max-content | ❌ 预览态容器失控 |

---

## 四、问题根因分析

### 4.1 主要问题：TemplatePreview.tsx 的 `minWidth: 'max-content'`

**位置**: `TemplatePreview.tsx` 第 2316、2339、2360、2391、2420、2448 行

**代码**:
```tsx
<div style={{
  minWidth: 'max-content',   // 【致命】内容决定宽度
  display: 'block',
  padding: '0',
  margin: '0',
}}>
```

**影响**:
- 容器宽度不再受父容器限制
- 长文本组件会撑开容器
- 导致内容溢出画布

### 4.2 次要问题：百分比宽度未正确计算

当 `component.layout.width` 是百分比时：
- 编辑态：`calc((100% - gap) / 2)` 精确计算
- 预览态：直接使用 `'50%'` 或 `'100%'`

### 4.3 布局容器差异

| 状态 | 容器样式 | 效果 |
|------|---------|------|
| 编辑态 | `width: ${contentWidth}px` | 固定宽度，内容受限 |
| 预览态 | `minWidth: 'max-content'` | 宽度由内容决定，无限扩张 |

---

## 五、修复建议

### 5.1 立即修复（关键）

**文件**: `TemplatePreview.tsx`

**修改所有包含 `minWidth: 'max-content'` 的地方**:

```tsx
// ❌ 修复前
<div style={{
  minWidth: 'max-content',
  display: 'block',
  padding: '0',
  margin: '0',
}}>

// ✅ 修复后
<div style={{
  width: '100%',              // 占满父容器
  maxWidth: '100%',           // 不超过父容器
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  gap: '12px',
  boxSizing: 'border-box',
}}>
```

### 5.2 组件宽度修复

**文件**: `TemplatePreview.tsx` - `renderComponent` 函数

```tsx
// ❌ 修复前
const baseStyle: React.CSSProperties = {
  width: component.layout?.width || '100%',
  flex: `0 0 ${component.layout?.width || '100%'}`,
  maxWidth: component.layout?.width || '100%',
};

// ✅ 修复后
const getComponentWidth = (width: string) => {
  const gap = 12;
  switch (width) {
    case '50%': return `calc((100% - ${gap}px) / 2)`;
    case '33%': return `calc((100% - ${2 * gap}px) / 3)`;
    case '25%': return `calc((100% - ${3 * gap}px) / 4)`;
    default: return '100%';
  }
};

const baseStyle: React.CSSProperties = {
  width: getComponentWidth(component.layout?.width || '100%'),
  flexShrink: 0,
  maxWidth: '100%',
};
```

### 5.3 renderComponentToHTML 修复

**文件**: `TemplatePreview.tsx` - `renderComponentToHTML` 函数

```tsx
// ❌ 修复前
const styleStr = `
  width: ${component.layout?.width || '100%'};
  flex: 0 0 ${component.layout?.width || '100%'};
  overflow-x: auto;
`;

// ✅ 修复后
const getWidthCalc = (width: string) => {
  const gap = 12;
  switch (width) {
    case '50%': return `calc((100% - ${gap}px) / 2)`;
    case '33%': return `calc((100% - ${2 * gap}px) / 3)`;
    case '25%': return `calc((100% - ${3 * gap}px) / 4)`;
    default: return '100%';
  }
};

const styleStr = `
  width: ${getWidthCalc(component.layout?.width || '100%')};
  flex-shrink: 0;
  max-width: 100%;
  overflow-x: visible;
`;
```

---

## 六、API/函数对比清单

### 6.1 模板编辑状态 API

```
✅ CanvasArea.tsx
   - getComponentWidthStyle(width, containerWidth): 精确calc计算
   - CanvasArea(): 主组件
   
✅ CanvasComponent.tsx
   - CanvasComponent(): 组件渲染
   - AutoResizingTextarea(): 自适应文本域
   
✅ SortableItem.tsx
   - SortableItem(): 拖拽包装
```

### 6.2 排版打印预览状态 API

```
⚠️ TemplatePreview.tsx
   - renderComponent(): React组件渲染
   - renderComponentToHTML(): HTML字符串生成
   - renderTableComponent(): 表格渲染
   - 【问题】minWidth: 'max-content' 在多处使用
   
⚠️ PrintPreviewDialog.tsx
   - PrintComponentRenderer(): 打印组件渲染
   - 【已修复】baseStyles 已添加 overflowWrap
```

---

## 七、修复验证清单

- [ ] 修改 TemplatePreview.tsx 所有 `minWidth: 'max-content'` 为 `width: '100%'` + `maxWidth: '100%'`
- [ ] 统一组件宽度计算逻辑（使用 calc）
- [ ] 确保 flex 容器使用 `flexWrap: 'wrap'`
- [ ] 验证打印预览不再溢出
- [ ] 验证模板编辑仍然正常
