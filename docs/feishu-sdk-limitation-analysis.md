# 飞书 SDK 复选框选中问题 - 最终解决方案

## 🔍 根本原因分析

通过详细日志分析，我们发现：

```
onRecordSelectChange 方法: undefined
getSelectRecordIds 方法: undefined
```

**飞书 SDK 在 iframe 环境中没有提供以下 API：**
- ❌ `bitable.ui.onRecordSelectChange()` - 不存在
- ❌ `bitable.ui.getSelectRecordIds()` - 不存在

## ✅ 可用的 API

**实际可用的 API：**
- ✅ `base.getSelection()` - 返回当前激活单元格信息
- ✅ `bitable.base.onSelectionChange()` - 监听选择变化

## 📊 当前选择状态返回的数据

```javascript
{
  tableId: 'tblgdYwBjM35cfsz',    // 表格 ID
  viewId: 'vewS40xgSx',           // 视图 ID
  recordId: 'recv7SVFqMyRT2',     // ✅ 记录 ID（点击行选择时）
  fieldId: 'fldAYL0SbS',          // 字段 ID（当前聚焦的单元格）
  baseId: 'ELEpbbBkMakauGs7...'   // 基础 ID
}
```

**关键点：**
- 当 `recordId` 有值时，表示用户**点击了某行**（行选中状态）
- 当 `recordId` 为 `null` 时，表示用户**点击了单元格**但未选中整行

## 🛠️ 最终解决方案

### 方案：使用 `base.getSelection()` + 轮询

由于 `bitable.ui.getSelectRecordIds()` 不存在，我们只能使用 `base.getSelection()` 来获取当前选中的**单条**记录。

**实现代码：**

```typescript
// 轮询获取当前选中记录
function startPolling(interval = 2000) {
  pollingInterval = setInterval(async () => {
    const selection = await base.getSelection();
    const currentRecordId = selection?.recordId;
    
    if (currentRecordId && currentRecordId !== lastPolledRecordId) {
      // 通知所有监听器
      const event = {
        data: {
          tableId: selection.tableId,
          recordIds: [currentRecordId],
          isSelectAll: false,
        },
      };
      
      onRecordSelectChangeCallbacks.forEach(cb => cb(event));
    }
  }, interval);
}
```

### 使用示例

```typescript
import { feishuEnv, CheckboxSelectionManager } from '@/lib/feishu-env';

// 方式1：使用管理器类
const manager = new CheckboxSelectionManager((records) => {
  console.log('选中的记录:', records);
});
await manager.init();

// 方式2：使用便捷函数
const records = await feishuEnv.getCheckboxSelectedRecords();

// 方式3：手动监听
const unsubscribe = feishuEnv.onRecordSelectChange((event) => {
  console.log('选中IDs:', event.data.recordIds);
});
```

## ⚠️ 限制说明

**当前方案的局限性：**

1. **只能获取单条记录** - 使用 `base.getSelection()` 只能获取当前激活的记录，无法获取复选框多选状态
2. **依赖点击行选择** - 用户必须点击行号或整行才能触发 `recordId` 变化
3. **复选框勾选无法检测** - 由于 SDK 限制，无法通过复选框勾选获取多条记录

## 💡 建议

**对于打印预览功能，建议采用以下交互方式：**

1. **点击行选择模式** - 用户点击行号选择单条记录进行预览
2. **添加"选择全部"按钮** - 通过 `table.getRecordIdList()` 获取所有记录
3. **手动输入记录ID** - 提供输入框让用户手动输入要打印的记录ID

## 📁 文件位置

- `src/lib/feishu-env.ts` - 完整的 SDK 封装
- `docs/feishu-checkbox-selection.md` - 使用指南
