/**
 * 飞书多维表格 - 复选框选中记录功能
 * 
 * 实现思路：
 * 1. 使用 bitable.ui.getSelectRecordIds() 获取复选框选中的记录 ID
 * 2. 使用 base.onSelectionChange() 监听选择变化
 * 3. 使用 table.getRecordById() 获取记录数据
 */

import { bitable, base } from '@lark-base-open/js-sdk';

// ============================================
// 类型定义
// ============================================

export interface CheckboxSelectionEvent {
  tableId: string;
  recordIds: string[];
  count: number;
  isSelectAll: boolean;
}

export interface RecordData {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
  modifiedTime?: string;
}

export type CheckboxSelectionCallback = (event: CheckboxSelectionEvent) => void;
export type RecordsCallback = (records: RecordData[]) => void;

// ============================================
// 调试日志
// ============================================

const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[FeishuSelection][${timestamp}] ${message}`, data !== undefined ? data : '');
}

// ============================================
// 复选框选中管理器
// ============================================

export class CheckboxSelectionManager {
  private callbacks: Set<CheckboxSelectionCallback> = new Set();
  private recordsCallbacks: Set<RecordsCallback> = new Set();
  private lastRecordIds: string[] = [];
  private lastTableId: string = '';
  private pollInterval: NodeJS.Timeout | null = null;
  private selectionUnsubscribe: (() => void) | null = null;
  private isInitialized: boolean = false;

  /**
   * 初始化管理器
   */
  async init(): Promise<boolean> {
    if (this.isInitialized) {
      debugLog('管理器已初始化');
      return true;
    }

    debugLog('======== 初始化复选框选中管理器 ========');

    try {
      // 1. 等待 SDK 就绪
      debugLog('等待 SDK 就绪...');
      // 使用 base API 等待就绪
      await base.getSelection();
      debugLog('✅ SDK 已就绪');

      // 2. 设置选择变化监听器
      await this.setupSelectionListener();

      // 3. 启动轮询作为备用方案
      this.startPolling(2000);

      this.isInitialized = true;
      debugLog('✅ 复选框选中管理器初始化完成');
      return true;
    } catch (error) {
      debugLog('❌ 初始化失败:', error);
      return false;
    }
  }

  /**
   * 设置选择变化监听器
   */
  private async setupSelectionListener(): Promise<void> {
    debugLog('设置选择变化监听器...');

    // 尝试使用 base.onSelectionChange
    if (typeof base.onSelectionChange === 'function') {
      try {
        this.selectionUnsubscribe = base.onSelectionChange(async (event) => {
          debugLog('🎯 选择变化事件触发:', event);
          await this.handleSelectionChange(event);
        });
        debugLog('✅ base.onSelectionChange 监听器设置成功');
      } catch (e) {
        debugLog('⚠️ base.onSelectionChange 设置失败:', e);
      }
    } else {
      debugLog('⚠️ base.onSelectionChange 不存在');
    }
  }

  /**
   * 处理选择变化
   */
  private async handleSelectionChange(event: any): Promise<void> {
    debugLog('处理选择变化...');

    try {
      // 获取当前选中的记录 IDs
      const recordIds = await this.getCheckboxSelectedIds();
      const tableId = event?.data?.tableId || await this.getCurrentTableId();

      // 检查是否有变化
      const hasChanged = 
        JSON.stringify(recordIds) !== JSON.stringify(this.lastRecordIds) ||
        tableId !== this.lastTableId;

      if (hasChanged) {
        debugLog('选择状态已变化:', { recordIds, tableId });

        this.lastRecordIds = recordIds;
        this.lastTableId = tableId;

        // 通知回调
        const selectionEvent: CheckboxSelectionEvent = {
          tableId,
          recordIds,
          count: recordIds.length,
          isSelectAll: false,
        };

        this.callbacks.forEach(cb => {
          try {
            cb(selectionEvent);
          } catch (e) {
            debugLog('回调执行失败:', e);
          }
        });

        // 如果有记录选中，自动获取记录数据
        if (recordIds.length > 0) {
          const records = await this.fetchRecordsByIds(tableId, recordIds);
          this.recordsCallbacks.forEach(cb => {
            try {
              cb(records);
            } catch (e) {
              debugLog('记录回调执行失败:', e);
            }
          });
        }
      }
    } catch (error) {
      debugLog('处理选择变化失败:', error);
    }
  }

  /**
   * 获取复选框选中的记录 IDs
   */
  async getCheckboxSelectedIds(): Promise<string[]> {
    debugLog('获取复选框选中的记录 IDs...');

    try {
      // 方法1: 使用 bitable.ui.getSelectRecordIds() (推荐)
      const uiApi = (bitable as any).ui;
      if (uiApi && typeof uiApi.getSelectRecordIds === 'function') {
        try {
          const recordIds = await uiApi.getSelectRecordIds();
          if (Array.isArray(recordIds) && recordIds.length > 0) {
            debugLog(`✅ bitable.ui.getSelectRecordIds() 返回 ${recordIds.length} 条记录`);
            return recordIds;
          }
        } catch (e) {
          debugLog('⚠️ bitable.ui.getSelectRecordIds() 调用失败:', e);
        }
      }

      // 方法2: 使用 base.getSelection() 获取单条选中
      const selection = await base.getSelection();
      if (selection?.recordId) {
        debugLog('✅ base.getSelection() 返回单条记录:', selection.recordId);
        return [selection.recordId];
      }

      debugLog('ℹ️ 没有选中记录');
      return [];
    } catch (error) {
      debugLog('❌ 获取选中记录失败:', error);
      return [];
    }
  }

  /**
   * 获取当前表格 ID
   */
  private async getCurrentTableId(): Promise<string> {
    try {
      const selection = await base.getSelection();
      return selection?.tableId || '';
    } catch {
      return '';
    }
  }

  /**
   * 根据记录 IDs 批量获取记录数据
   */
  async fetchRecordsByIds(tableId: string, recordIds: string[]): Promise<RecordData[]> {
    debugLog(`批量获取记录: tableId=${tableId}, count=${recordIds.length}`);

    if (!tableId || recordIds.length === 0) {
      return [];
    }

    try {
      // 获取表格实例
      const table = await base.getTable(tableId);
      if (!table) {
        debugLog('❌ 无法获取表格实例');
        return [];
      }

      // 获取字段元信息（用于解析字段名）
      const fieldMetaList = await this.getFieldMetaList(table);

      // 批量获取记录
      const records: RecordData[] = [];

      // 飞书 SDK 不支持批量获取，需要逐条获取
      for (const recordId of recordIds) {
        try {
          const record = await table.getRecordById(recordId);
          if (record) {
            // 解析字段数据
            const processedFields = this.processRecordFields(record.fields, fieldMetaList);
            records.push({
              id: recordId,
              fields: processedFields,
              createdTime: (record as any).createdTime,
              modifiedTime: (record as any).modifiedTime,
            });
          }
        } catch (e) {
          debugLog(`获取记录 ${recordId} 失败:`, e);
        }
      }

      debugLog(`✅ 获取到 ${records.length} 条记录`);
      return records;
    } catch (error) {
      debugLog('❌ 批量获取记录失败:', error);
      return [];
    }
  }

  /**
   * 获取字段元信息列表
   */
  private async getFieldMetaList(table: any): Promise<Map<string, string>> {
    const fieldMap = new Map<string, string>();

    try {
      const fields = await table.getFieldList();
      for (const field of fields) {
        const id = field.id || await field.getId();
        const name = field.name || await field.getName();
        fieldMap.set(id, name);
      }
    } catch (e) {
      debugLog('获取字段列表失败:', e);
    }

    return fieldMap;
  }

  /**
   * 处理记录字段数据
   */
  private processRecordFields(
    fields: Record<string, unknown>,
    fieldMap: Map<string, string>
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = {};

    for (const [fieldId, value] of Object.entries(fields)) {
      const fieldName = fieldMap.get(fieldId) || fieldId;
      processed[fieldName] = this.extractFieldValue(value);
    }

    return processed;
  }

  /**
   * 提取字段值
   */
  private extractFieldValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return '';
    }

    // 数组类型（多选、人员、附件等）
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return item.text || item.name || item.value || item.url || String(item.id || '');
        }
        return String(item);
      }).join(', ');
    }

    // 对象类型
    if (typeof value === 'object') {
      return (value as any).text || (value as any).name || (value as any).value || JSON.stringify(value);
    }

    return value;
  }

  /**
   * 启动轮询检查（备用方案）
   */
  private startPolling(interval: number): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    debugLog(`启动轮询检查，间隔 ${interval}ms`);

    this.pollInterval = setInterval(async () => {
      try {
        await this.handleSelectionChange({ data: {} });
      } catch (e) {
        // 静默处理轮询错误
      }
    }, interval);
  }

  /**
   * 停止轮询
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      debugLog('轮询已停止');
    }
  }

  /**
   * 注册选中变化回调
   */
  onSelectionChange(callback: CheckboxSelectionCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 注册记录数据回调
   */
  onRecordsChange(callback: RecordsCallback): () => void {
    this.recordsCallbacks.add(callback);
    return () => {
      this.recordsCallbacks.delete(callback);
    };
  }

  /**
   * 手动刷新选中记录
   */
  async refresh(): Promise<RecordData[]> {
    const recordIds = await this.getCheckboxSelectedIds();
    const tableId = await this.getCurrentTableId();

    if (recordIds.length > 0 && tableId) {
      return this.fetchRecordsByIds(tableId, recordIds);
    }

    return [];
  }

  /**
   * 获取当前选中的记录 IDs
   */
  getSelectedRecordIds(): string[] {
    return [...this.lastRecordIds];
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopPolling();

    if (this.selectionUnsubscribe) {
      this.selectionUnsubscribe();
      this.selectionUnsubscribe = null;
    }

    this.callbacks.clear();
    this.recordsCallbacks.clear();
    this.isInitialized = false;
    debugLog('复选框选中管理器已销毁');
  }
}

// ============================================
// 单例实例
// ============================================

let globalManager: CheckboxSelectionManager | null = null;

/**
 * 获取全局管理器实例
 */
export function getCheckboxManager(): CheckboxSelectionManager {
  if (!globalManager) {
    globalManager = new CheckboxSelectionManager();
  }
  return globalManager;
}

/**
 * 初始化并返回管理器
 */
export async function initCheckboxManager(): Promise<CheckboxSelectionManager> {
  const manager = getCheckboxManager();
  await manager.init();
  return manager;
}

/**
 * 快捷方法：获取选中的记录 IDs
 */
export async function getSelectedRecordIds(): Promise<string[]> {
  const manager = getCheckboxManager();
  if (!manager['isInitialized']) {
    await manager.init();
  }
  return manager.getCheckboxSelectedIds();
}

/**
 * 快捷方法：获取选中的记录数据
 */
export async function getSelectedRecords(): Promise<RecordData[]> {
  const manager = getCheckboxManager();
  if (!manager['isInitialized']) {
    await manager.init();
  }
  return manager.refresh();
}
