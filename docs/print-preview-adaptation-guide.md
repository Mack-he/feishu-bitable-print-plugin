# 模板编辑状态排版预览适配到打印预览模式技术文档

## 1. 概述

### 1.1 目标
将模板编辑状态中的排版预览功能完整适配到打印预览模式，确保两个视图中组件的渲染效果一致。

### 1.2 涉及文件

| 文件路径 | 功能描述 | 适配优先级 |
|---------|---------|-----------|
| `src/components/editor/canvas/CanvasArea.tsx` | 编辑状态画布容器 | P0 |
| `src/components/editor/canvas/CanvasComponent.tsx` | 编辑状态组件渲染器 | P0 |
| `src/components/editor/dialogs/PrintPreviewDialog.tsx` | 打印预览对话框 | P0 |
| `src/components/print/EnhancedPrintPreview.tsx` | 增强打印预览 | P1 |
| `src/components/VariableTextRenderer.tsx` | 变量文本渲染器 | P0 |
| `src/components/editor/variables/*.tsx` | 变量相关组件 | P1 |

---

## 2. 现有架构分析

### 2.1 编辑状态画布架构

```
EditorPage
└── CanvasArea (DndContext)
    └── SortableItem (拖拽包装器)
        └── CanvasComponent (组件渲染器)
            ├── 文本组件渲染
            ├── 表格组件渲染 (复杂)
            ├── 图片组件渲染
            └── 其他组件渲染
```

**关键特性：**
- 使用 `dnd-kit` 实现拖拽排序
- 支持组件宽度调整（100%、50%、33%、25%）
- 使用 `flex-wrap` 实现流式布局
- 表格支持编辑模式、变量替换、附件字段

### 2.2 打印预览架构

```
PrintPreviewDialog
├── PrintComponentRenderer (独立渲染器)
│   ├── 文本组件渲染
│   ├── 表格组件渲染 (简化)
│   └── 其他组件渲染
└── 页面布局控制
```

**当前问题：**
- `PrintComponentRenderer` 是独立实现，与 `CanvasComponent` 不同步
- 表格渲染过于简化，缺少变量替换和附件支持
- 缺少统一的组件渲染抽象层

---

## 3. 核心差异对比

### 3.1 表格渲染差异

| 功能特性 | 编辑状态 (CanvasComponent) | 打印预览 (PrintComponentRenderer) |
|---------|--------------------------|--------------------------------|
| 基础表格结构 | ✅ 支持 | ✅ 支持 |
| 单元格合并 | ✅ rowSpan/colSpan | ✅ rowSpan/colSpan |
| 列宽配置 | ✅ colWidths | ❌ 不支持 |
| 变量替换 | ✅ resolveVariables | ⚠️ 简单实现 |
| 附件字段 | ✅ AttachmentVariableChip | ❌ 不支持 |
| 单元格样式 | ✅ 完整支持 | ⚠️ 部分支持 |
| 边框样式 | ✅ cell.border | ❌ 不支持 |
| 垂直对齐 | ✅ verticalAlign | ✅ 支持 |

### 3.2 变量渲染差异

| 功能特性 | 编辑状态 | 打印预览 |
|---------|---------|---------|
| 文本变量 | ✅ VariableTextRenderer | ✅ VariableTextRenderer |
| 附件变量 | ✅ AttachmentVariableChip | ❌ 仅显示文本 |
| 人员变量 | ✅ 支持 | ⚠️ 显示为文本 |
| 日期变量 | ✅ 格式化显示 | ⚠️ 简单显示 |

### 3.3 布局计算差异

**编辑状态 (CanvasArea.tsx):**
```typescript
// 计算内容区域宽度
const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;

// 组件宽度样式
function getComponentWidthStyle(width: string, containerWidth: number) {
  const gap = 12; // gap-3 = 12px
  switch (width) {
    case '50%': return { width: `calc((100% - ${gap}px) / 2)` };
    case '33%': return { width: `calc((100% - ${2 * gap}px) / 3)` };
    case '25%': return { width: `calc((100% - ${3 * gap}px) / 4)` };
    default: return { width: '100%' };
  }
}
```

**打印预览 (PrintPreviewDialog.tsx):**
```typescript
// 已有相同的布局计算逻辑
// 需要确保参数一致
```

---

## 4. 适配方案

### 4.1 方案概述

**核心思路：** 创建统一的组件渲染器 `UnifiedComponentRenderer`，被编辑状态和打印预览共同使用。

```
UnifiedComponentRenderer (新建)
├── 接收统一的 props
├── 根据 mode 参数区分渲染模式
│   ├── edit: 编辑模式（支持交互）
│   └── preview: 预览模式（纯展示）
└── 调用统一的子渲染函数

CanvasComponent ──→ UnifiedComponentRenderer (mode=edit)
PrintComponentRenderer ──→ UnifiedComponentRenderer (mode=preview)
```

### 4.2 详细实施步骤

#### 步骤 1：创建统一组件渲染器

**文件：** `src/components/editor/canvas/UnifiedComponentRenderer.tsx`

```typescript
// 统一渲染模式类型
export type RenderMode = 'edit' | 'preview' | 'print';

// 统一渲染器 Props
export interface UnifiedRenderProps {
  component: CanvasComponentNode;
  mode: RenderMode;
  
  // 通用数据
  styleConfig: StyleConfig;
  fields?: Field[];
  record?: Record<string, unknown>;
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  
  // 编辑模式特有
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdate?: (updates: Partial<CanvasComponentNode>) => void;
  
  // 预览模式特有
  isEmptyPreview?: boolean;
}

// 主渲染函数
export function UnifiedComponentRenderer({
  component,
  mode,
  styleConfig,
  fields,
  record,
  attachmentConfigs,
  isSelected,
  onSelect,
  onUpdate,
  isEmptyPreview,
}: UnifiedRenderProps) {
  switch (component.type) {
    case 'text':
      return renderTextComponent({ ... });
    case 'table':
      return renderTableComponent({ ... });
    case 'image':
      return renderImageComponent({ ... });
    // ... 其他组件类型
  }
}
```

#### 步骤 2：重构表格渲染逻辑

**目标：** 将表格渲染逻辑抽取为独立函数，支持编辑和预览两种模式。

```typescript
// 统一表格渲染函数
function renderTableComponent({
  component,
  mode,
  styleConfig,
  fields,
  record,
  attachmentConfigs,
  isEmptyPreview,
}: TableRenderProps) {
  const tableComp = component as TableCanvasNode;
  const tableConfig = tableComp.tableConfig;
  
  if (!tableConfig?.cells) {
    return <EmptyTablePlaceholder />;
  }
  
  // 计算列宽
  const colWidths = calculateColumnWidths(tableConfig);
  
  return (
    <table style={getTableStyles(styleConfig, tableConfig)}>
      <tbody>
        {tableConfig.cells.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, colIndex) => renderTableCell({
              cell,
              rowIndex,
              colIndex,
              colWidths,
              mode,
              styleConfig,
              fields,
              record,
              attachmentConfigs,
              isEmptyPreview,
            }))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 统一单元格渲染
function renderTableCell({
  cell,
  rowIndex,
  colIndex,
  colWidths,
  mode,
  ...otherProps
}: TableCellRenderProps) {
  // 处理合并单元格
  if (cell.rowSpan === 0 || cell.colSpan === 0) {
    return null;
  }
  
  // 单元格样式
  const cellStyles = getCellStyles(cell, colWidths[colIndex]);
  
  // 单元格内容渲染
  const cellContent = mode === 'edit' 
    ? renderEditableCellContent(cell, otherProps)
    : renderPreviewCellContent(cell, otherProps);
  
  return (
    <td
      key={`${rowIndex}-${colIndex}`}
      rowSpan={cell.rowSpan || 1}
      colSpan={cell.colSpan || 1}
      style={cellStyles}
    >
      {cellContent}
    </td>
  );
}

// 预览模式单元格内容
function renderPreviewCellContent(
  cell: TableCellData,
  {
    fields,
    record,
    attachmentConfigs,
    isEmptyPreview,
    styleConfig,
  }: PreviewCellProps
) {
  const content = cell.content || '';
  
  // 变量解析
  const resolvedContent = resolveVariables(content, record, fields);
  
  // 检查是否包含附件变量
  const attachmentVars = extractAttachmentVariables(content);
  
  if (attachmentVars.length > 0) {
    return (
      <AttachmentVariablePreview
        variables={attachmentVars}
        record={record}
        attachmentConfigs={attachmentConfigs}
        isEmptyPreview={isEmptyPreview}
        textStyle={cell.style}
      />
    );
  }
  
  return (
    <VariableTextRenderer
      text={resolvedContent}
      records={record ? [record] : []}
      fields={fields || []}
      tagName="span"
      textStyle={cell.style}
    />
  );
}
```

#### 步骤 3：创建附件变量预览组件

**文件：** `src/components/editor/variables/AttachmentVariablePreview.tsx`

```typescript
interface AttachmentVariablePreviewProps {
  variables: string[];
  record: Record<string, unknown>;
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  isEmptyPreview?: boolean;
  textStyle?: Partial<ComponentTextStyle>;
}

export function AttachmentVariablePreview({
  variables,
  record,
  attachmentConfigs,
  isEmptyPreview,
  textStyle,
}: AttachmentVariablePreviewProps) {
  // 获取附件数据
  const attachmentData = variables.map(varName => {
    const value = record[varName];
    const config = attachmentConfigs?.[varName];
    
    return {
      name: varName,
      value,
      config,
    };
  });
  
  // 根据 displayMode 渲染
  return (
    <div className="attachment-preview-container">
      {attachmentData.map(item => (
        <AttachmentItemPreview
          key={item.name}
          data={item}
          textStyle={textStyle}
          isEmptyPreview={isEmptyPreview}
        />
      ))}
    </div>
  );
}

function AttachmentItemPreview({
  data,
  textStyle,
  isEmptyPreview,
}: AttachmentItemPreviewProps) {
  const { value, config } = data;
  
  // 解析附件数据
  const attachments = parseAttachmentValue(value);
  
  // 根据 displayMode 选择渲染方式
  const displayMode = config?.displayMode || 'basic';
  
  switch (displayMode) {
    case 'image_only':
      return <AttachmentImagesOnly attachments={attachments} textStyle={textStyle} />;
    case 'basic':
    default:
      return <AttachmentBasicInfo attachments={attachments} textStyle={textStyle} />;
  }
}
```

#### 步骤 4：重构 PrintPreviewDialog

**目标：** 使用统一渲染器替换现有的 `PrintComponentRenderer`。

```typescript
// PrintPreviewDialog.tsx 修改

import { UnifiedComponentRenderer } from '@/components/editor/canvas/UnifiedComponentRenderer';

// 删除现有的 PrintComponentRenderer 组件

// 在渲染逻辑中使用统一渲染器
const renderPageContent = useCallback((record: Record<string, unknown>) => {
  return (
    <div className="flex flex-wrap content-start gap-3" style={{ width: `${contentWidth}px` }}>
      {components.map((component) => {
        const layoutWidth = component.layout?.width || '100%';
        
        return (
          <div
            key={component.id}
            style={{
              ...getComponentWidthStyle(layoutWidth),
              boxSizing: 'border-box',
            }}
          >
            <UnifiedComponentRenderer
              component={component}
              mode="preview"
              styleConfig={styleConfig}
              fields={fields}
              record={record}
              attachmentConfigs={attachmentConfigs}
              isEmptyPreview={isEmptyPreview}
            />
          </div>
        );
      })}
    </div>
  );
}, [components, fields, styleConfig, contentWidth, attachmentConfigs, isEmptyPreview]);
```

#### 步骤 5：重构 CanvasComponent

**目标：** 使用统一渲染器，仅在编辑模式下添加交互逻辑。

```typescript
// CanvasComponent.tsx 修改

import { UnifiedComponentRenderer, RenderMode } from './UnifiedComponentRenderer';

export function CanvasComponent({ component, isSelected, onSelect }: CanvasComponentProps) {
  const { /* ... */ } = useEditorStore();
  
  // 编辑模式特有的交互逻辑
  const handleDoubleClick = useCallback(() => {
    // 进入编辑模式
  }, []);
  
  // 包装器添加交互事件
  return (
    <div
      className={cn("canvas-component-wrapper", { selected: isSelected })}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      <UnifiedComponentRenderer
        component={component}
        mode="edit"
        styleConfig={styleConfig}
        fields={fields}
        record={previewRecord}
        attachmentConfigs={attachmentConfigs}
        isSelected={isSelected}
        onSelect={onSelect}
        onUpdate={handleUpdate}
      />
      
      {/* 编辑模式特有的 UI 元素 */}
      {isSelected && <ComponentToolbar />}
      {isSelected && <ResizeHandles />}
    </div>
  );
}
```

---

## 5. 详细适配清单

### 5.1 表格组件适配清单

| 序号 | 功能项 | 编辑状态 | 打印预览 | 适配方案 | 优先级 |
|-----|-------|---------|---------|---------|-------|
| 1 | 基础表格结构 | ✅ | ✅ | 无需修改 | - |
| 2 | 单元格合并 | ✅ | ⚠️ | 统一渲染逻辑 | P0 |
| 3 | 列宽配置 | ✅ | ❌ | 添加 colWidths 支持 | P0 |
| 4 | 单元格边框样式 | ✅ | ❌ | 添加 border 样式支持 | P1 |
| 5 | 单元格背景色 | ✅ | ⚠️ | 统一背景色渲染 | P1 |
| 6 | 单元格垂直对齐 | ✅ | ⚠️ | 统一 verticalAlign | P1 |
| 7 | 表头表尾行 | ✅ | ❌ | 添加 headerRows/footerRows | P1 |
| 8 | 变量替换 | ✅ | ⚠️ | 统一变量解析逻辑 | P0 |
| 9 | 附件变量渲染 | ✅ | ❌ | 创建 AttachmentVariablePreview | P0 |
| 10 | 人员变量渲染 | ✅ | ❌ | 添加人员变量预览 | P1 |
| 11 | 日期变量渲染 | ✅ | ⚠️ | 统一日期格式化 | P1 |

### 5.2 文本组件适配清单

| 序号 | 功能项 | 编辑状态 | 打印预览 | 适配方案 | 优先级 |
|-----|-------|---------|---------|---------|-------|
| 1 | 基础文本渲染 | ✅ | ✅ | 无需修改 | - |
| 2 | 富文本样式 | ✅ | ⚠️ | 统一样式渲染 | P0 |
| 3 | 变量替换 | ✅ | ✅ | 使用 VariableTextRenderer | - |
| 4 | 附件变量 | ✅ | ❌ | 统一附件渲染 | P0 |
| 5 | 标题级别 | ✅ | ⚠️ | 统一 headingLevel 渲染 | P1 |
| 6 | 列表类型 | ✅ | ⚠️ | 统一 listType 渲染 | P1 |

### 5.3 布局适配清单

| 序号 | 功能项 | 编辑状态 | 打印预览 | 适配方案 | 优先级 |
|-----|-------|---------|---------|---------|-------|
| 1 | 组件宽度 | ✅ | ✅ | 统一 getComponentWidthStyle | - |
| 2 | 页边距 | ✅ | ✅ | 统一 contentWidth 计算 | - |
| 3 | 组件间距 | ✅ | ⚠️ | 确认 gap-3 一致性 | P0 |
| 4 | 纸张尺寸 | ✅ | ✅ | 统一 PAGE_SIZES | - |
| 5 | 缩放控制 | ✅ | ✅ | 统一缩放逻辑 | P1 |

---

## 6. 变量解析统一方案

### 6.1 当前实现分析

**编辑状态变量解析：**
```typescript
// CanvasComponent.tsx
const parseVariables = (text: string, record: any, fields: Field[]) => {
  return text.replace(/\[([^\]]+)\]/g, (match, varName) => {
    const field = fields.find(f => f.name === varName);
    const value = record?.[varName];
    // ... 复杂的值处理逻辑
    return displayValue;
  });
};
```

**打印预览变量解析：**
```typescript
// PrintPreviewDialog.tsx
const resolveVariables = (text: string) => {
  return text.replace(/\[([^\]]+)\]/g, (match, varName) => {
    return String(record[varName] || match);
  });
};
```

### 6.2 统一方案

**创建统一变量解析器：**

```typescript
// src/utils/unifiedVariableResolver.ts

export interface VariableResolverOptions {
  record?: Record<string, unknown>;
  fields?: Field[];
  fieldTypeMap?: FieldTypeMap;
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  mode: 'edit' | 'preview' | 'print';
  isEmptyPreview?: boolean;
}

export interface ResolvedVariable {
  name: string;
  rawValue: unknown;
  displayValue: string;
  type: 'text' | 'attachment' | 'person' | 'date' | 'number' | 'other';
  config?: AttachmentVariableConfig;
}

export function resolveVariables(
  text: string,
  options: VariableResolverOptions
): string | React.ReactNode[] {
  const { record, fields, fieldTypeMap, attachmentConfigs, mode, isEmptyPreview } = options;
  
  // 提取所有变量
  const variables = extractVariables(text);
  
  if (variables.length === 0) {
    return text;
  }
  
  // 解析每个变量
  const resolvedVariables = variables.map(varName => {
    const field = fields?.find(f => f.name === varName);
    const fieldType = fieldTypeMap?.[varName] || field?.fieldKind || 'other';
    const value = record?.[varName];
    const config = attachmentConfigs?.[varName];
    
    return {
      name: varName,
      rawValue: value,
      displayValue: formatValueByType(value, fieldType, isEmptyPreview),
      type: fieldType,
      config,
    } as ResolvedVariable;
  });
  
  // 根据模式返回不同结果
  if (mode === 'print' || mode === 'preview') {
    return renderResolvedText(text, resolvedVariables);
  }
  
  return text;
}

function formatValueByType(
  value: unknown,
  type: string,
  isEmptyPreview: boolean
): string {
  if (isEmptyPreview) {
    return `[${type}]`; // 占位符
  }
  
  switch (type) {
    case 'date':
      return formatDate(value);
    case 'person':
      return formatPerson(value);
    case 'attachment':
      return `[附件: ${getAttachmentCount(value)}个]`;
    default:
      return String(value ?? '');
  }
}
```

---

## 7. 附件变量预览适配

### 7.1 附件数据结构

```typescript
// 飞书附件字段值格式
interface FeishuAttachment {
  file_token: string;
  name: string;
  size: number;
  type: string;
  tmp_url?: string;
}

// 附件配置
interface AttachmentVariableConfig {
  displayMode: 'basic' | 'image_only';
  imageSize?: {
    width: number | 'auto';
    height: number | 'auto';
  };
}
```

### 7.2 预览渲染逻辑

```typescript
// src/components/editor/variables/AttachmentVariablePreview.tsx

export function AttachmentVariablePreview({
  fieldName,
  value,
  config,
  textStyle,
  mode,
}: AttachmentVariablePreviewProps) {
  // 解析附件列表
  const attachments = parseAttachments(value);
  
  // 空预览模式
  if (!attachments || attachments.length === 0) {
    return <span style={textStyle}>[{fieldName}]</span>;
  }
  
  // 根据 displayMode 渲染
  const displayMode = config?.displayMode || 'basic';
  
  if (displayMode === 'image_only') {
    // 只显示图片
    const imageAttachments = attachments.filter(a => 
      a.type?.startsWith('image/')
    );
    
    if (imageAttachments.length === 0) {
      return null;
    }
    
    return (
      <div className="attachment-images">
        {imageAttachments.map((img, index) => (
          <img
            key={index}
            src={getAttachmentUrl(img)}
            alt={img.name}
            style={{
              maxWidth: config?.imageSize?.width || 'auto',
              maxHeight: config?.imageSize?.height || 100,
            }}
          />
        ))}
      </div>
    );
  }
  
  // 基础信息模式
  return (
    <div className="attachment-basic">
      {attachments.map((att, index) => (
        <div key={index} className="attachment-item">
          <FileIcon type={att.type} />
          <span style={textStyle}>{att.name}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 8. 测试验证方案

### 8.1 单元测试

```typescript
// __tests__/unifiedComponentRenderer.test.tsx

describe('UnifiedComponentRenderer', () => {
  describe('表格渲染', () => {
    it('应该在预览模式下正确渲染表格结构', () => {
      // ...
    });
    
    it('应该正确处理单元格合并', () => {
      // ...
    });
    
    it('应该正确应用列宽配置', () => {
      // ...
    });
    
    it('应该正确渲染变量', () => {
      // ...
    });
    
    it('应该正确渲染附件变量', () => {
      // ...
    });
  });
  
  describe('文本渲染', () => {
    it('应该在预览模式下正确渲染文本', () => {
      // ...
    });
    
    it('应该正确处理富文本样式', () => {
      // ...
    });
  });
});
```

### 8.2 视觉对比测试

1. **创建测试用例：**
   - 包含各种组件类型的模板
   - 包含变量的文本组件
   - 包含附件字段的表格

2. **对比方法：**
   - 截图对比编辑状态和打印预览
   - 使用像素对比工具验证一致性

### 8.3 手动测试清单

| 测试项 | 操作步骤 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|---------|-----|
| 表格基础渲染 | 创建表格，进入打印预览 | 表格结构与编辑状态一致 | | ⬜ |
| 表格变量替换 | 表格中插入变量，预览 | 变量值正确显示 | | ⬜ |
| 表格附件字段 | 表格中插入附件变量 | 附件正确渲染 | | ⬜ |
| 表格合并单元格 | 合并单元格后预览 | 合并效果一致 | | ⬜ |
| 表格列宽 | 设置列宽后预览 | 列宽比例一致 | | ⬜ |
| 组件宽度 | 设置50%宽度预览 | 宽度占比正确 | | ⬜ |
| 页边距 | 设置页边距后预览 | 内容区域正确 | | ⬜ |

---

## 9. 实施计划

### 9.1 阶段一：基础适配 (P0)

1. 创建 `UnifiedComponentRenderer.tsx`
2. 重构表格渲染逻辑
3. 统一变量解析器
4. 创建 `AttachmentVariablePreview.tsx`
5. 重构 `PrintPreviewDialog.tsx`

### 9.2 阶段二：完善适配 (P1)

1. 重构 `CanvasComponent.tsx`
2. 完善附件变量预览
3. 添加人员变量、日期变量预览
4. 统一布局计算逻辑

### 9.3 阶段三：测试与优化 (P2)

1. 编写单元测试
2. 执行视觉对比测试
3. 性能优化
4. 文档更新

---

## 10. 风险评估

### 10.1 技术风险

| 风险项 | 影响 | 概率 | 缓解措施 |
|-------|-----|-----|---------|
| 重构影响现有功能 | 高 | 中 | 分步骤实施，保留回滚点 |
| 性能下降 | 中 | 低 | 使用 React.memo，避免不必要的重渲染 |
| 样式不一致 | 中 | 中 | 详细的视觉对比测试 |

### 10.2 兼容性风险

| 风险项 | 影响 | 概率 | 缓解措施 |
|-------|-----|-----|---------|
| 旧模板数据格式 | 高 | 低 | 保持向后兼容，添加数据迁移 |
| 浏览器打印差异 | 中 | 中 | 添加打印样式媒体查询 |

---

## 11. 附录

### 11.1 相关类型定义

```typescript
// src/types/editor.ts

// 表格单元格数据
export interface TableCellData {
  id: string;
  content: string;
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
  style?: Partial<ComponentTextStyle>;
  border?: TableCellBorderStyle;
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

// 表格配置
export interface TableConfig {
  headerRows: number;
  footerRows: number;
  borderColor: string;
  borderWidth: number;
  showOuterBorder: boolean;
  showInnerBorder: boolean;
  cells: TableCellData[][];
  colWidths?: number[]; // 列宽数组
}
```

### 11.2 参考文档

- [React 组件设计模式](https://react.dev/learn/thinking-in-react)
- [打印样式最佳实践](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/)
- [飞书多维表格 API](https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview)

---

*文档版本: v1.0*
*创建日期: 2025-01-XX*
*最后更新: 2025-01-XX*
