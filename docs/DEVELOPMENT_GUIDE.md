# 飞书多维表格排版打印插件 - 开发文档

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [核心功能模块](#3-核心功能模块)
4. [数据流设计](#4-数据流设计)
5. [关键实现细节](#5-关键实现细节)
6. [飞书SDK集成](#6-飞书sdk集成)
7. [附件字段处理](#7-附件字段处理)
8. [打印功能实现](#8-打印功能实现)
9. [开发调试指南](#9-开发调试指南)
10. [常见问题排查](#10-常见问题排查)

---

## 1. 项目概述

### 1.1 项目简介

本项目是一个飞书多维表格侧边栏插件，支持用户自定义排版模板、批量打印数据记录。主要功能包括：

- **模板编辑器**：可视化拖拽式排版编辑
- **变量系统**：支持文本、附件、人员等多种字段类型
- **批量打印**：支持多选记录批量打印
- **模板管理**：模板保存、加载、分享

### 1.2 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + React 19 |
| 语言 | TypeScript 5 |
| 状态管理 | Zustand 5 |
| UI组件库 | shadcn/ui (Radix UI) |
| 样式方案 | Tailwind CSS 4 |
| 拖拽功能 | @dnd-kit |
| 富文本编辑 | @tiptap |
| 飞书集成 | @lark-base-open/js-sdk |
| 后端 | Next.js API Routes + Drizzle ORM + PostgreSQL |
| 打印生成 | jsPDF + html2canvas |

### 1.3 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes (后端)
│   │   ├── feishu/           # 飞书 API 代理
│   │   └── templates/        # 模板管理 API
│   └── page.tsx              # 入口页面
├── components/
│   ├── editor/               # 编辑器组件
│   │   ├── canvas/           # 画布组件
│   │   ├── dialogs/          # 弹窗组件
│   │   ├── panels/           # 面板组件
│   │   ├── table/            # 表格组件
│   │   └── variables/        # 变量渲染组件
│   ├── print/                # 打印相关组件
│   └── ui/                   # shadcn/ui 基础组件
├── lib/                      # 核心库
│   ├── feishu-env.ts         # 飞书环境检测与SDK封装
│   ├── feishu-service.ts     # 飞书数据服务层
│   ├── attachment-processor.ts # 附件预处理
│   └── db/                   # 数据库相关
├── store/                    # Zustand 状态管理
│   ├── editorStore.ts        # 编辑器状态
│   ├── templateStore.ts      # 模板状态
│   └── selectedDataStore.ts  # 选中数据状态
├── types/                    # TypeScript 类型定义
│   └── editor.ts             # 核心类型
└── utils/                    # 工具函数
    ├── variableParser.ts     # 变量解析
    └── printUtils.ts         # 打印工具
```

---

## 2. 技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      飞书多维表格侧边栏                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 模板管理面板 │  │  编辑器画布  │  │ 数据源面板  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         │                                   │
│                   ┌─────┴─────┐                             │
│                   │ Zustand   │                             │
│                   │  Store    │                             │
│                   └─────┬─────┘                             │
│                         │                                   │
├─────────────────────────┼───────────────────────────────────┤
│                   数据服务层                                   │
│  ┌─────────────┐  ┌─────┴─────┐  ┌─────────────┐           │
│  │ feishu-env  │  │ feishu-   │  │ attachment- │           │
│  │ (SDK封装)   │  │ service   │  │ processor   │           │
│  └─────────────┘  └───────────┘  └─────────────┘           │
│                         │                                   │
├─────────────────────────┼───────────────────────────────────┤
│                   飞书 SDK                                  │
│              @lark-base-open/js-sdk                         │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                    飞书多维表格
```

### 2.2 前后端分离架构

```
┌────────────────────────────────────────────────────────────┐
│                       前端 (Next.js)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    React Components                    │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │EditorPage  │  │TemplatePrev│  │PrintPreview│      │  │
│  │  └────────────┘  └────────────┘  └────────────┘      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Zustand Store                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │editorStore │  │templateSto │  │selectedData│      │  │
│  │  └────────────┘  └────────────┘  └────────────┘      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Service Layer                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │feishu-env  │  │feishu-serv │  │ attachment │      │  │
│  │  │ (SDK模式)  │  │ (API模式)  │  │ processor  │      │  │
│  │  └────────────┘  └────────────┘  └────────────┘      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                    后端 (API Routes)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │/api/feishu │  │/api/templat│  │/api/auth   │           │
│  │  /records  │  │    es      │  │  /feishu   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM + PostgreSQL                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                    飞书开放平台 API                          │
└────────────────────────────────────────────────────────────┘
```

### 2.3 运行模式

项目支持两种运行模式：

#### SDK 模式（侧边栏插件）
- 在飞书多维表格侧边栏中运行
- 直接使用 `@lark-base-open/js-sdk` 获取数据
- 无需用户授权，自动获取上下文

#### API 模式（独立部署）
- 独立 Web 应用运行
- 通过后端 API 调用飞书开放平台
- 需要用户授权和配置 App Token

---

## 3. 核心功能模块

### 3.1 编辑器模块

#### 画布组件 (CanvasArea)

画布是模板编辑的核心区域，支持流式布局：

```typescript
// src/components/editor/canvas/CanvasArea.tsx
export function CanvasArea() {
  const components = useEditorStore(state => state.components);
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={components}>
        {components.map(component => (
          <SortableItem key={component.id} component={component} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

#### 组件类型

支持的组件类型定义：

```typescript
// src/types/editor.ts
export type ComponentType = 
  | 'text'       // 文本组件
  | 'heading'    // 标题组件（H1-H6）
  | 'paragraph'  // 段落组件（支持首行缩进）
  | 'list'       // 列表组件（有序/无序）
  | 'table'      // 表格组件
  | 'image'      // 图片组件
  | 'qrcode'     // 二维码
  | 'barcode'    // 条形码
  | 'line'       // 水平线
  | 'fieldContainer'; // 字段容器（条件渲染）
```

### 3.2 变量系统

#### 变量解析流程

```
用户输入: "姓名：{{姓名}}，照片：{{照片}}"
              │
              ▼
        variableParser.extractVariables()
              │
              ▼
    解析结果: [{type: 'text', fieldName: '姓名'}, 
              {type: 'attachment', fieldName: '照片'}]
              │
              ▼
        MixedContentRenderer 渲染
              │
              ▼
    最终输出: "姓名：张三，照片：<img src='...'/>"
```

#### 变量渲染器

```typescript
// src/components/editor/variables/MixedContentRenderer.tsx
export function MixedContentRenderer({ content, records, fields }: Props) {
  // 解析变量
  const variables = extractVariables(content);
  
  // 渲染每个变量
  return (
    <>
      {variables.map(variable => {
        if (variable.type === 'attachment') {
          return <AttachmentVariable key={variable.id} {...variable} />;
        }
        return <TextVariableTag key={variable.id} {...variable} />;
      })}
    </>
  );
}
```

### 3.3 表格组件

表格组件是本项目最复杂的组件，支持：

- 动态列配置
- 单元格编辑
- 表头/表脚设置
- 边框样式自定义

```typescript
// src/components/editor/table/TableComponent.tsx
export function TableComponent({ component }: Props) {
  const { tableConfig } = component;
  const records = useEditorStore(state => state.records);
  
  // 表格数据渲染
  const renderTableData = () => {
    return records.map((record, rowIndex) => (
      <tr key={record.id || rowIndex}>
        {tableConfig.columns.map(col => (
          <td key={col.fieldId}>
            <VariableTextRenderer 
              content={`{{${col.fieldName}}}`}
              record={record}
            />
          </td>
        ))}
      </tr>
    ));
  };
  
  return (
    <table className="w-full border-collapse">
      {/* 表头 */}
      {tableConfig.headerRows > 0 && <thead>...</thead>}
      {/* 数据行 */}
      <tbody>{renderTableData()}</tbody>
      {/* 表脚 */}
      {tableConfig.footerRows > 0 && <tfoot>...</tfoot>}
    </table>
  );
}
```

### 3.4 打印模块

#### 打印预览流程

```
┌────────────────┐
│ 选择模板和数据  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ 变量替换渲染   │
│ replaceVariables()
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ HTML 转 Canvas │
│ html2canvas()  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Canvas 转 PDF  │
│ jsPDF.addImage()│
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  下载/打印 PDF │
└────────────────┘
```

---

## 4. 数据流设计

### 4.1 状态管理架构

```typescript
// src/store/editorStore.ts
interface EditorState {
  // 模板数据
  templateId: string | null;
  templateName: string;
  components: CanvasComponentNode[];
  
  // 字段数据
  fields: Field[];
  fieldTypeMap: FieldTypeMap;
  
  // 记录数据
  records: Record<string, unknown>[];
  selectedRecordIds: string[];
  
  // 飞书上下文
  feishuContext: FeishuContext | null;
  
  // 附件配置
  attachmentConfigs: Record<string, AttachmentVariableConfig>;
  
  // 历史记录（撤销/重做）
  history: CanvasComponentNode[][];
  historyIndex: number;
}
```

### 4.2 数据流向

```
┌─────────────────────────────────────────────────────────────┐
│                      数据获取流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                            │
│  │ 飞书多维表格 │                                            │
│  └──────┬──────┘                                            │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────┐                  │
│  │          feishu-env.ts               │                  │
│  │  - 环境检测                           │                  │
│  │  - SDK 初始化                         │                  │
│  │  - 选择变化监听                       │                  │
│  └──────────────────┬───────────────────┘                  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────┐                  │
│  │        feishu-service.ts             │                  │
│  │  - fetchFields() 获取字段列表         │                  │
│  │  - fetchRecords() 获取记录数据        │                  │
│  │  - 附件预处理                         │                  │
│  └──────────────────┬───────────────────┘                  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────┐                  │
│  │           Zustand Store              │                  │
│  │  - editorStore (编辑器状态)           │                  │
│  │  - templateStore (模板状态)           │                  │
│  │  - selectedDataStore (选中数据)       │                  │
│  └──────────────────┬───────────────────┘                  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────┐                  │
│  │          React Components            │                  │
│  │  - CanvasArea (画布渲染)              │                  │
│  │  - TemplatePreview (预览)             │                  │
│  │  - PrintPreview (打印)                │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 记录选择机制

复选框选择状态通过轮询检测实现（因为 `onSelectionChange` 不触发复选框多选事件）：

```typescript
// src/lib/feishu-selection.ts
export async function startSelectionPolling(interval: number = 1000) {
  const pollSelection = async () => {
    const selection = await base.getSelection();
    const recordIds = await getCheckboxSelectedRecordIds(selection.tableId);
    
    // 检测变化并触发回调
    if (hasSelectionChanged(recordIds)) {
      onSelectionChangeCallbacks.forEach(cb => cb({
        tableId: selection.tableId,
        recordIds,
        isSelectAll: false
      }));
    }
  };
  
  setInterval(pollSelection, interval);
}
```

---

## 5. 关键实现细节

### 5.1 字段容器组件

字段容器组件根据字段值决定是否渲染内容：

```typescript
// src/types/editor.ts
export interface FieldContainerCanvasNode extends BaseCanvasNode {
  type: 'fieldContainer';
  fieldNames: string[];           // 绑定的字段名列表
  children: CanvasComponentNode[]; // 子组件
  showCondition?: 'any' | 'all';  // 显示条件
}

// 渲染逻辑
export function FieldContainer({ component }: Props) {
  const records = useEditorStore(state => state.records);
  const record = records[0];
  
  // 检查字段是否有值
  const hasValue = component.showCondition === 'all'
    ? component.fieldNames.every(name => hasFieldValue(record[name]))
    : component.fieldNames.some(name => hasFieldValue(record[name]));
  
  if (!hasValue) return null;
  
  return (
    <div className="field-container">
      {component.children.map(child => (
        <CanvasComponent key={child.id} component={child} />
      ))}
    </div>
  );
}
```

### 5.2 模板持久化

模板保存到 PostgreSQL 数据库：

```typescript
// src/lib/db/schema.ts
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  data: jsonb('data').notNull(), // 模板配置 JSON
  userId: varchar('user_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// API Route: /api/templates/
export async function POST(request: Request) {
  const body = await request.json();
  const template = await db.insert(templates).values({
    name: body.name,
    data: body.data,
  }).returning();
  return Response.json({ success: true, template });
}
```

### 5.3 撤销/重做机制

使用历史记录栈实现：

```typescript
// src/store/editorStore.ts
interface EditorState {
  history: CanvasComponentNode[][];
  historyIndex: number;
  
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
}

// 保存到历史记录
saveToHistory: () => {
  const { components, history, historyIndex } = get();
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push([...components]);
  set({ 
    history: newHistory, 
    historyIndex: newHistory.length - 1 
  });
},

// 撤销
undo: () => {
  const { history, historyIndex } = get();
  if (historyIndex > 0) {
    set({ 
      components: history[historyIndex - 1],
      historyIndex: historyIndex - 1 
    });
  }
},

// 重做
redo: () => {
  const { history, historyIndex } = get();
  if (historyIndex < history.length - 1) {
    set({ 
      components: history[historyIndex + 1],
      historyIndex: historyIndex + 1 
    });
  }
},
```

---

## 6. 飞书SDK集成

### 6.1 环境检测

```typescript
// src/lib/feishu-env.ts
export async function initFeishuEnv(): Promise<boolean> {
  try {
    // 等待 SDK 就绪
    await bitable.bridge.onReady();
    
    // 获取 base 实例
    const baseInstance = await bitable.base;
    
    if (baseInstance) {
      envStatus = 'ready';
      onReadyCallbacks.forEach(cb => cb());
      return true;
    } else {
      envStatus = 'not_feishu';
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }
  } catch (error) {
    envStatus = 'error';
    envError = String(error);
    return false;
  }
}
```

### 6.2 数据获取

```typescript
// src/lib/feishu-service.ts
export async function fetchRecords(options?: {
  recordIds?: string[];
}): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    // SDK 模式：直接调用 SDK
    const { base } = await import('@lark-base-open/js-sdk');
    const selection = await base.getSelection();
    const table = await base.getTable(selection.tableId);
    
    if (options?.recordIds) {
      // 批量获取指定记录
      const records = await table.getRecordsByIds(options.recordIds);
      return records.map(r => ({ id: r.id, ...r.fields }));
    } else {
      // 获取所有记录
      const recordIds = await table.getRecordIdList();
      const records = await table.getRecordsByIds(recordIds);
      return records.map(r => ({ id: r.id, ...r.fields }));
    }
  } else {
    // API 模式：调用后端 API
    const response = await fetch('/api/feishu/records/', {
      method: 'POST',
      body: JSON.stringify({ recordIds: options?.recordIds }),
    });
    const result = await response.json();
    return result.records;
  }
}
```

### 6.3 字段类型映射

```typescript
// src/lib/feishu-env.ts
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text',          // 文本
  2: 'number',        // 数字
  3: 'singleSelect',  // 单选
  4: 'multiSelect',   // 多选
  5: 'date',          // 日期
  6: 'checkbox',      // 复选框
  7: 'user',          // 人员（旧）
  8: 'url',           // 超链接
  9: 'phone',         // 电话
  10: 'email',        // 邮箱
  11: 'user',         // 人员
  17: 'attachment',   // 附件
  // ... 其他类型
};
```

---

## 7. 附件字段处理

### 7.1 处理流程

```
┌─────────────────────────────────────────────────────────────┐
│                      附件处理流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 识别附件字段                                            │
│     └── fieldMetaList.filter(f => f.type === 17)           │
│                                                             │
│  2. 获取附件 URL                                            │
│     └── table.getField(fieldId).getAttachmentUrls(tokens)  │
│                                                             │
│  3. 生成 HTML 内容                                          │
│     └── <img src="{url}" style="max-width: 100px"/>        │
│                                                             │
│  4. 存储到 _html 字段                                       │
│     └── record['_照片_html'] = htmlContent                 │
│                                                             │
│  5. 渲染到组件                                              │
│     └── dangerouslySetInnerHTML={{ __html: record._html }} │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 核心实现

```typescript
// src/lib/attachment-processor.ts
export async function processRecordAttachments(
  record: Record<string, any>,
  fields: FieldMeta[],
  fieldTypeMap?: Record<string, string>,
  table?: any
): Promise<Record<string, any>> {
  const processedRecord = { ...record };
  
  // 识别附件字段
  const attachmentFields = fields.filter(f => 
    fieldTypeMap?.[f.name] === 'attachment' || f.type === 17
  );
  
  for (const field of attachmentFields) {
    const attachments = record[field.name];
    if (!Array.isArray(attachments) || attachments.length === 0) continue;
    
    // 提取 token 列表
    const tokens = attachments.map(a => a.token || a.file_token).filter(Boolean);
    
    if (tokens.length > 0 && table) {
      // 获取临时 URL
      const attachmentField = await table.getField(field.id);
      const urls = await attachmentField.getAttachmentUrls(tokens);
      
      // 生成 HTML
      const images = urls.map((url: string, idx: number) => 
        `<img src="${url}" alt="${attachments[idx]?.name || ''}" 
             style="max-width: 100px; margin: 4px;"/>`
      ).join('');
      
      // 存储 _html 字段
      processedRecord[`_${field.name}_html`] = `<div class="attachment-images">${images}</div>`;
    }
  }
  
  return processedRecord;
}
```

### 7.3 URL 缓存机制

```typescript
// src/lib/attachment-processor.ts
const urlCache = new Map<string, { url: string; expiry: number }>();
const CACHE_DURATION = 9 * 60 * 1000; // 9分钟

export async function getAttachmentUrl(
  token: string,
  fieldId: string,
  recordId: string,
  attachmentIndex: number,
  table: any
): Promise<string | null> {
  const cacheKey = `${token}-${fieldId}-${recordId}-${attachmentIndex}`;
  
  // 检查缓存
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.url;
  }
  
  // 获取新 URL
  const attachmentField = await table.getField(fieldId);
  const urls = await attachmentField.getAttachmentUrls([token]);
  const url = urls[0];
  
  // 存入缓存
  if (url) {
    urlCache.set(cacheKey, { url, expiry: Date.now() + CACHE_DURATION });
  }
  
  return url;
}
```

---

## 8. 打印功能实现

### 8.1 PDF 生成流程

```typescript
// src/lib/print/pdf-generator.ts
export async function generatePDF(
  element: HTMLElement,
  config: PrintConfig
): Promise<Blob> {
  // 1. HTML 转 Canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
  
  // 2. 创建 PDF
  const pdf = new jsPDF({
    orientation: config.orientation,
    unit: 'mm',
    format: config.pageSize,
  });
  
  // 3. 计算尺寸
  const imgWidth = pdf.internal.pageSize.getWidth();
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  // 4. 添加图片
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  
  // 5. 分页处理
  if (imgHeight > pdf.internal.pageSize.getHeight()) {
    let remainingHeight = imgHeight;
    let position = 0;
    
    while (remainingHeight > 0) {
      pdf.addPage();
      position -= pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      remainingHeight -= pdf.internal.pageSize.getHeight();
    }
  }
  
  return pdf.output('blob');
}
```

### 8.2 批量打印

```typescript
// src/components/print/BatchPrint.tsx
export function BatchPrint({ records, template }: Props) {
  const handlePrintAll = async () => {
    const pdfDoc = new jsPDF();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // 渲染模板
      const element = await renderTemplate(template, record);
      
      // 转换为 Canvas
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/jpeg');
      
      // 添加到 PDF
      if (i > 0) pdfDoc.addPage();
      pdfDoc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }
    
    // 下载 PDF
    pdfDoc.save('batch-print.pdf');
  };
  
  return <Button onClick={handlePrintAll}>批量打印</Button>;
}
```

---

## 9. 开发调试指南

### 9.1 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev

# 类型检查
pnpm ts-check

# 构建生产版本
pnpm build
```

### 9.2 飞书侧边栏调试

1. 在飞书开放平台创建应用
2. 配置多维表格侧边栏插件地址
3. 使用内网穿透或部署到公网
4. 在多维表格中添加插件进行测试

### 9.3 调试日志

项目内置了详细的调试日志系统：

```typescript
// src/lib/feishu-env.ts
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[FeishuEnv][${timestamp}] ${message}`, data || '');
}
```

开启调试模式后，控制台会显示：
- SDK 初始化状态
- 数据获取过程
- 选择变化事件
- 附件处理详情

---

## 10. 常见问题排查

### 10.1 附件图片不显示

**症状**：模板编辑状态下点击多维表格行，附件字段容器中未载入图片。

**排查步骤**：

1. 检查控制台日志是否有 `_html` 字段：
   ```
   [AttachmentProcessor] 返回前验证，所有 _html 字段: ['_照片_html']
   ```

2. 确认附件处理函数被调用：
   ```
   [FeishuService] ========== 开始处理附件字段 ==========
   ```

3. 检查 `CanvasComponent` 是否获取到 `_html` 字段：
   ```
   [CanvasComponent] 第一条记录的 _html 字段: {htmlFields: Array(2), ...}
   ```

**常见原因**：
- 浏览器缓存了旧代码，需要强制刷新（`Ctrl+Shift+R`）
- 初始化阶段未执行附件处理，检查 `feishu-service.ts` 的 `fetchRecords` 函数

### 10.2 复选框多选不触发

**症状**：勾选复选框后，记录未添加到列表。

**原因**：`base.onSelectionChange` 不触发复选框多选事件。

**解决方案**：使用轮询检测机制：

```typescript
// src/lib/feishu-selection.ts
await startSelectionPolling(1000);
```

### 10.3 热更新不生效

**症状**：修改代码后，浏览器运行的仍是旧代码。

**解决方案**：

1. 清理 Next.js 缓存：
   ```bash
   rm -rf .next/cache
   ```

2. 重启开发服务：
   ```bash
   pnpm dev
   ```

3. 强制刷新浏览器（`Ctrl+Shift+R`）

### 10.4 飞书环境检测失败

**症状**：控制台显示 `not_feishu` 或 `error`。

**排查步骤**：

1. 确认页面在飞书环境中打开（`*.feishu.cn` 或 `*.larksuite.com`）
2. 检查 SDK 是否正确加载：
   ```javascript
   console.log(window.lark); // 应该有值
   ```
3. 查看控制台是否有 CORS 或 CSP 错误

---

## 附录

### A. 类型定义速查

```typescript
// 字段类型
interface Field {
  id: string;
  name: string;
  type: string;
  fieldKind?: 'attachment' | 'person' | 'text' | 'number' | 'date' | 'other';
}

// 组件节点
type CanvasComponentNode = 
  | TextCanvasNode 
  | TableCanvasNode 
  | ImageCanvasNode 
  | QRCodeCanvasNode 
  | BarcodeCanvasNode 
  | LineCanvasNode
  | FieldContainerCanvasNode;

// 模板配置
interface PrintTemplate {
  id: string;
  name: string;
  components: CanvasComponentNode[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
}
```

### B. API 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/feishu/fields/` | GET | 获取字段列表 |
| `/api/feishu/records/` | POST | 获取记录数据 |
| `/api/templates/` | GET/POST | 模板列表/创建 |
| `/api/templates/[id]` | GET/PUT/DELETE | 模板详情/更新/删除 |
| `/api/auth/feishu/login` | GET | 飞书授权登录 |
| `/api/auth/feishu/callback` | GET | 飞书授权回调 |

### C. 环境变量

```bash
# 数据库配置
DATABASE_URL=postgresql://...

# 飞书应用配置
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx

# 加密密钥
JWT_SECRET=xxx
```

---

**文档版本**: v1.0  
**最后更新**: 2024年

