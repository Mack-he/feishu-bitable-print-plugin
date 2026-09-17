# 急救包 (First Aid Kit)

> 本文件用于存放修复成功或迭代完成的关键代码，在出现严重BUG时可参考恢复。

---

## 目录

1. [打印预览空字段显示问题](#1-打印预览空字段显示问题)
2. [字段容器组件实现](#2-字段容器组件实现)
3. [模板配置持久化修复](#3-模板配置持久化修复)
4. [模板编辑状态附件处理](#4-模板编辑状态附件处理)
5. [字段值检测逻辑](#5-字段值检测逻辑)

---

## 1. 打印预览空字段显示问题

**修复日期**: 2024年

**问题描述**: 
打印预览模式下，字段变量没有值时显示 `[空]` 或 `[暂无数据]`，影响打印效果。

**解决方案**:
空字段在打印预览模式下不渲染任何内容。

**关键代码** (`src/components/VariableTextRenderer.tsx`):

```typescript
// 在预览状态下，字段值渲染逻辑
} else {
  // 预览状态：显示字段值
  const value = getFieldValue(fieldName, records, fields);
  
  // 【修复】打印预览模式下，空字段不显示任何内容
  if (value === '[空]' || value === '[暂无数据]' || value === '') {
    // 不添加任何内容到 parts，保持空白
  } else {
    parts.push(
      <VariableChip
        key={`var-${index}`}
        fieldName={fieldName}
        value={value}
        textStyle={textStyle}
      />
    );
  }
}
```

---

## 2. 字段容器组件实现

**修复日期**: 2024年

**问题描述**: 
需要根据字段是否有值来决定是否显示容器内容。

**解决方案**:
新增 `fieldContainer` 组件类型，支持条件渲染。

### 2.1 类型定义 (`src/types/editor.ts`)

```typescript
// 在 BaseCanvasNode.type 中添加 'fieldContainer'
export interface BaseCanvasNode {
  id: string;
  type: 'text' | 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'barcode' | 'qrcode' | 'line' | 'fieldContainer';
  width: number;
  height?: number;
  minHeight?: number;
  layout?: ComponentLayout;
}

// 新增字段容器节点类型
export interface FieldContainerCanvasNode extends BaseCanvasNode {
  type: 'fieldContainer';
  // 绑定的字段名列表
  fieldNames: string[];
  // 容器内的子组件
  children: CanvasComponentNode[];
  // 显示条件：'any' 任意字段有值显示 | 'all' 所有字段有值才显示
  showCondition?: 'any' | 'all';
}

// 在 CanvasComponentNode 联合类型中添加
export type CanvasComponentNode = 
  | TextCanvasNode 
  | HeadingCanvasNode
  | ParagraphCanvasNode
  | ListCanvasNode
  | TableCanvasNode 
  | ImageCanvasNode 
  | BarcodeCanvasNode 
  | QRCodeCanvasNode 
  | LineCanvasNode
  | FieldContainerCanvasNode;

// 在 ComponentType 枚举中添加
export type ComponentType = 
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'table'
  | 'image'
  | 'qrcode'
  | 'barcode'
  | 'line'
  | 'freeElement'
  | 'article'
  | 'autoTable'
  | 'fieldContainer';

// 在 DEFAULT_COMPONENT_SIZES 中添加
export const DEFAULT_COMPONENT_SIZES: Record<ComponentType, { width: number; height: number }> = {
  // ... 其他组件
  fieldContainer: { width: 100, height: 60 },
};
```

### 2.2 渲染逻辑 (`src/components/editor/canvas/UnifiedComponentRenderer.tsx`)

```typescript
// 在 switch 中添加 case
case 'fieldContainer':
  return renderFieldContainerComponent({
    component,
    styleConfig,
    fields,
    fieldTypeMap,
    record,
    attachmentConfigs,
    isEmptyPreview,
    mode,
  });

// 字段值检测函数
function checkFieldHasValue(
  fieldName: string,
  record: Record<string, unknown> | undefined,
  fields: Field[]
): boolean {
  if (!record) return false;
  
  const fieldId = fields.find(f => f.name === fieldName)?.id;
  
  let value: unknown;
  
  if (fieldId) {
    if (record[fieldId] !== undefined) {
      value = record[fieldId];
    } else if (record.fields && (record.fields as Record<string, unknown>)[fieldId] !== undefined) {
      value = (record.fields as Record<string, unknown>)[fieldId];
    }
  }
  
  if (value === undefined) {
    if (record[fieldName] !== undefined) {
      value = record[fieldName];
    } else if (record.fields && (record.fields as Record<string, unknown>)[fieldName] !== undefined) {
      value = (record.fields as Record<string, unknown>)[fieldName];
    }
  }
  
  if (value === null || value === undefined) return false;
  if (value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  
  // 检查附件字段的预处理数据
  const htmlContent = record[`_${fieldName}_html`];
  const fileNames = record[`_${fieldName}_names`];
  
  if (htmlContent && typeof htmlContent === 'string' && htmlContent.length > 0) {
    return true;
  }
  if (Array.isArray(fileNames) && fileNames.length > 0) {
    return true;
  }
  
  return true;
}

// 渲染字段容器组件
function renderFieldContainerComponent({
  component,
  styleConfig,
  fields,
  fieldTypeMap,
  record,
  attachmentConfigs,
  isEmptyPreview,
  mode,
}: TextRenderProps): React.ReactNode {
  const containerComp = component as any;
  const fieldNames = containerComp.fieldNames || [];
  const children = containerComp.children || [];
  const showCondition = containerComp.showCondition || 'any';
  
  // 编辑模式：始终显示容器（方便编辑）
  if (mode === 'edit') {
    return (
      <div 
        className="field-container"
        style={{ 
          width: '100%',
          border: '2px dashed #e5e7eb',
          borderRadius: '4px',
          padding: '8px',
          backgroundColor: '#f9fafb',
        }}
      >
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <span>📦 字段容器</span>
          <span className="text-blue-500">[{fieldNames.join(', ')}]</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {children.map((child: any) => (
            <div key={child.id} style={{ width: '100%' }}>
              <UnifiedComponentRenderer
                component={child}
                mode={mode}
                styleConfig={styleConfig}
                fields={fields}
                fieldTypeMap={fieldTypeMap}
                record={record}
                attachmentConfigs={attachmentConfigs}
                isEmptyPreview={isEmptyPreview}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // 空数据预览时：显示容器内容
  if (isEmptyPreview) {
    return (
      <div className="field-container" style={{ width: '100%' }}>
        <div className="flex flex-wrap gap-3">
          {children.map((child: any) => (
            <div key={child.id} style={{ width: '100%' }}>
              <UnifiedComponentRenderer
                component={child}
                mode={mode}
                styleConfig={styleConfig}
                fields={fields}
                fieldTypeMap={fieldTypeMap}
                record={record}
                attachmentConfigs={attachmentConfigs}
                isEmptyPreview={isEmptyPreview}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // 有数据时：检查字段是否有值
  const fieldValues = fieldNames.map((fieldName: string) => ({
    name: fieldName,
    hasValue: checkFieldHasValue(fieldName, record, fields),
  }));
  
  const shouldShow = showCondition === 'all'
    ? fieldValues.every((f: { name: string; hasValue: boolean }) => f.hasValue)
    : fieldValues.some((f: { name: string; hasValue: boolean }) => f.hasValue);
  
  if (!shouldShow) {
    return null;
  }
  
  return (
    <div className="field-container" style={{ width: '100%' }}>
      <div className="flex flex-wrap gap-3">
        {children.map((child: any) => (
          <div key={child.id} style={{ width: '100%' }}>
            <UnifiedComponentRenderer
              component={child}
              mode={mode}
              styleConfig={styleConfig}
              fields={fields}
              fieldTypeMap={fieldTypeMap}
              record={record}
              attachmentConfigs={attachmentConfigs}
              isEmptyPreview={isEmptyPreview}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 3. 模板配置持久化修复

**修复日期**: 2024年

**问题描述**: 
模板保存时丢失附件变量配置 (attachmentConfigs)，导致重新加载模板后配置丢失。

**解决方案**:
在 PrintTemplate 接口和保存/加载方法中添加 attachmentConfigs 支持。

### 3.1 类型定义 (`src/types/editor.ts`)

```typescript
export interface PrintTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  tags: string[];
  components: (EditorComponent | CanvasComponentNode)[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  // 【新增】附件变量配置
  attachmentConfigs?: Record<string, {
    fieldName: string;
    displayMode: 'image_only' | 'basic_info' | 'advanced';
    sizeMode: 'auto' | 'fixed_width' | 'fixed_height' | 'fixed_size';
    width?: number;
    height?: number;
    onePerLine: boolean;
    align: 'left' | 'center' | 'right';
    emptyDisplay: 'default' | 'custom';
    emptyCustomText?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 导出模板 (`src/store/editorStore.ts`)

```typescript
exportTemplate: () => {
  const state = get();
  return {
    id: state.templateId || uuidv4(),
    name: state.templateName,
    components: state.components,
    pageConfig: state.pageConfig,
    styleConfig: state.styleConfig,
    // 【新增】保存附件变量配置
    attachmentConfigs: state.attachmentConfigs,
    category: 'custom',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
},
```

### 3.3 加载模板 (`src/store/editorStore.ts`)

```typescript
loadTemplate: (template) => {
  const convertedComponents = template.components.map((comp: any) => {
    const { x, y, zIndex, ...rest } = comp;
    return rest;
  }) as CanvasComponentNode[];
  
  set({
    templateId: template.id,
    templateName: template.name,
    components: convertedComponents,
    pageConfig: { ...template.pageConfig },
    styleConfig: { ...template.styleConfig },
    // 【新增】恢复附件变量配置
    attachmentConfigs: template.attachmentConfigs || {},
    history: [convertedComponents],
    historyIndex: 0,
  });
},

loadTemplateFromData: (data) => {
  if (!data) return;
  
  const components = data.components || [];
  const pageConfig = data.pageConfig || get().pageConfig;
  const styleConfig = data.styleConfig || get().styleConfig;
  
  set({
    templateName: data.templateName || '未命名模板',
    components: components,
    pageConfig: { ...pageConfig },
    styleConfig: { ...styleConfig },
    // 【新增】恢复附件变量配置
    attachmentConfigs: data.attachmentConfigs || {},
    history: components.length > 0 ? [components] : [],
    historyIndex: 0,
  });
},
```

---

## 4. 模板编辑状态附件处理

**修复日期**: 2024年

**问题描述**: 
模板编辑状态下点击多维表格行数据时，附件字段容器不载入附件信息。

**解决方案**:
在 EditorPage.tsx 中添加 processRecordAttachments 调用。

**关键代码** (`src/components/editor/EditorPage.tsx`):

```typescript
// 1. 导入附件处理函数
import { processRecordAttachments } from '@/lib/attachment-processor';

// 2. 初始化获取第一条记录时处理附件
if (records.length > 0) {
  const appRecords = records.map((record, index) => ({
    id: record.id,
    ...record.fields,
    _rowIndex: index,
  }));
  
  // 【新增】处理附件字段
  console.log('[EditorPage] 开始处理附件字段...');
  const processedRecords = await Promise.all(
    appRecords.map(async (record) => {
      try {
        const processed = await processRecordAttachments(
          record,
          appFields,
          fieldTypeMap
        );
        console.log(`[EditorPage] 记录 ${record.id} 附件处理完成`);
        return processed;
      } catch (err) {
        console.error(`[EditorPage] 记录 ${record.id} 附件处理失败:`, err);
        return record;
      }
    })
  );
  
  setFeishuRecords(records);
  setRecords(processedRecords as unknown as Record<string, unknown>[]);
}

// 3. 点击行累积添加记录时处理附件
try {
  const records = await feishuEnv.getSelectedRecords();
  
  if (records.length > 0) {
    const currentFields = useEditorStore.getState().fields;
    const currentFieldTypeMap = useEditorStore.getState().fieldTypeMap;
    
    const appRecords = records.map((record, index) => ({
      id: record.id,
      ...record.fields,
      _rowIndex: index,
    }));
    
    // 【新增】处理附件字段
    const processedRecords = await Promise.all(
      appRecords.map(async (record) => {
        try {
          const processed = await processRecordAttachments(
            record, 
            currentFields, 
            currentFieldTypeMap
          );
          return processed;
        } catch (err) {
          console.error(`[EditorPage] 记录 ${record.id} 附件处理失败:`, err);
          return record;
        }
      })
    );
    
    addRecords(processedRecords as unknown as Record<string, unknown>[]);
  }
} catch (error) {
  console.error('[EditorPage] 获取选中记录失败:', error);
}
```

**【重要修复】传入 table 参数**:
```typescript
// 在获取字段后，需要获取 table 对象：
const { base } = await import('@lark-base-open/js-sdk');
const activeTable = await base.getActiveTable();

// 然后传入 table 参数：
const processedRecords = await Promise.all(
  appRecords.map(async (record) => {
    return await processRecordAttachments(
      record,
      appFields,
      fieldTypeMap,
      activeTable  // 【关键】传入 table 参数
    );
  })
);
```

**重要说明**:
- `processRecordAttachments` 需要 `table` 参数来调用飞书 API 获取附件 URL
- 如果不传入 `table`，函数会尝试通过 `getFeishuTable()` 自动获取，但可能在某些情况下失败
- 建议在调用前显式获取 `table` 并传入

**【代码锁定状态】** ✅ 已加锁
以下三处代码已添加 `//lock` 注释，表示修复成功：
1. 初始化获取第一条记录时的附件处理（约 225-255 行）
2. 表格变化重新获取记录时的附件处理（约 335-355 行）
3. 点击行累积添加记录时的附件处理（约 395-425 行）

**【待修复问题】** ⚠️
- 点选多维表格行数据不能向画布载入预览（此功能待进一步排查）

---

## 5. 字段值检测逻辑

**修复日期**: 2024年

**问题描述**: 
字段容器无法正确检测附件字段是否有值。

**解决方案**:
在 checkFieldHasValue 中增加对预处理字段的检测。

**关键代码** (`src/components/editor/canvas/UnifiedComponentRenderer.tsx`):

```typescript
function checkFieldHasValue(
  fieldName: string,
  record: Record<string, unknown> | undefined,
  fields: Field[]
): boolean {
  if (!record) return false;
  
  // 构建字段名到字段ID的映射
  const fieldId = fields.find(f => f.name === fieldName)?.id;
  
  let value: unknown;
  
  // 尝试通过字段ID获取值
  if (fieldId) {
    if (record[fieldId] !== undefined) {
      value = record[fieldId];
    } else if (record.fields && (record.fields as Record<string, unknown>)[fieldId] !== undefined) {
      value = (record.fields as Record<string, unknown>)[fieldId];
    }
  }
  
  // 如果通过字段ID没找到，尝试直接用字段名
  if (value === undefined) {
    if (record[fieldName] !== undefined) {
      value = record[fieldName];
    } else if (record.fields && (record.fields as Record<string, unknown>)[fieldName] !== undefined) {
      value = (record.fields as Record<string, unknown>)[fieldName];
    }
  }
  
  // 检查值是否有效
  if (value === null || value === undefined) return false;
  if (value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  
  // 【关键】检查附件字段的预处理数据
  // 附件字段经过 processRecordAttachments 处理后会生成 _fieldName_html 和 _fieldName_names
  const htmlContent = record[`_${fieldName}_html`];
  const fileNames = record[`_${fieldName}_names`];
  
  // 如果有预处理的 HTML 内容或文件名列表，也算有值
  if (htmlContent && typeof htmlContent === 'string' && htmlContent.length > 0) {
    return true;
  }
  if (Array.isArray(fileNames) && fileNames.length > 0) {
    return true;
  }
  
  return true;
}
```

---

## 使用说明

### 如何使用急救包

1. **定位问题**: 根据错误日志或现象，确定是哪个功能出了问题
2. **查找代码**: 在本文件中找到对应的章节
3. **恢复代码**: 将关键代码复制到对应文件中
4. **验证修复**: 运行 `npx tsc --noEmit` 检查类型错误

### 更新急救包

每次完成重要修复后，应该更新本文件：
1. 添加新的章节记录修复内容
2. 更新现有章节的代码（如果有改进）
3. 注明修复日期和问题描述

---

## 注意事项

1. **不要随意修改无关代码**: 修复问题时只修改必要的代码
2. **保持代码整洁**: 删除调试日志和注释
3. **测试验证**: 修改后务必测试相关功能
4. **及时备份**: 重大修改前先备份当前代码

---

*最后更新: 2024年*
