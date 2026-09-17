/**
 * 飞书客户端 - 前端调用封装
 * 用于替代 @lark-base-open/js-sdk，改为调用后端API
 */

import type { FeishuField, FeishuRecord, FeishuEvent } from './feishu-api-client';

export interface FeishuClientConfig {
  appToken: string;
  tableId: string;
  baseUrl?: string;
}

export type SelectionChangeCallback = (event: FeishuEvent) => void;

/**
 * 飞书客户端类
 */
export class FeishuClient {
  private appToken: string;
  private tableId: string;
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private selectionChangeCallbacks: Set<SelectionChangeCallback> = new Set();
  private initialized: boolean = false;

  constructor(config: FeishuClientConfig) {
    this.appToken = config.appToken;
    this.tableId = config.tableId;
    this.baseUrl = config.baseUrl || '';
  }

  /**
   * 初始化环境
   */
  async init(config?: Partial<FeishuClientConfig>): Promise<void> {
    if (config?.appToken) this.appToken = config.appToken;
    if (config?.tableId) this.tableId = config.tableId;

    const response = await fetch(`${this.baseUrl}/api/feishu/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appToken: this.appToken,
        tableId: this.tableId,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '初始化失败');
    }

    this.initialized = true;
  }

  /**
   * 获取字段列表
   */
  async getFields(): Promise<FeishuField[]> {
    const params = new URLSearchParams({
      appToken: this.appToken,
      tableId: this.tableId,
    });

    const response = await fetch(`${this.baseUrl}/api/feishu/fields?${params}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '获取字段列表失败');
    }

    return result.fields;
  }

  /**
   * 获取单条记录
   */
  async getRecord(recordId: string): Promise<FeishuRecord> {
    const params = new URLSearchParams({
      appToken: this.appToken,
      tableId: this.tableId,
      recordId,
    });

    const response = await fetch(`${this.baseUrl}/api/feishu/records?${params}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '获取记录失败');
    }

    return result.record;
  }

  /**
   * 批量获取记录
   */
  async getRecords(recordIds?: string[], processFields: boolean = true): Promise<FeishuRecord[]> {
    const response = await fetch(`${this.baseUrl}/api/feishu/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appToken: this.appToken,
        tableId: this.tableId,
        recordIds,
        processFields,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '获取记录失败');
    }

    return result.records;
  }

  /**
   * 搜索记录
   */
  async searchRecords(options?: {
    viewId?: string;
    filter?: any;
    sort?: Array<{ field_id: string; desc: boolean }>;
    processFields?: boolean;
  }): Promise<FeishuRecord[]> {
    const response = await fetch(`${this.baseUrl}/api/feishu/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appToken: this.appToken,
        tableId: this.tableId,
        viewId: options?.viewId,
        filter: options?.filter,
        sort: options?.sort,
        processFields: options?.processFields ?? true,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '搜索记录失败');
    }

    return result.records;
  }

  /**
   * 获取所有记录
   */
  async getAllRecords(processFields: boolean = true): Promise<FeishuRecord[]> {
    return this.getRecords(undefined, processFields);
  }

  /**
   * 监听选中变化事件
   * 注意：这是一个简化的实现，实际的选中变化需要通过其他方式触发
   */
  onSelectionChange(callback: SelectionChangeCallback): () => void {
    this.selectionChangeCallbacks.add(callback);

    // 如果是第一个回调，启动SSE连接
    if (this.selectionChangeCallbacks.size === 1) {
      this.startEventStream();
    }

    // 返回取消订阅函数
    return () => {
      this.selectionChangeCallbacks.delete(callback);

      // 如果没有回调了，关闭SSE连接
      if (this.selectionChangeCallbacks.size === 0) {
        this.stopEventStream();
      }
    };
  }

  /**
   * 启动SSE事件流
   */
  private startEventStream(): void {
    if (this.eventSource) return;

    const params = new URLSearchParams({
      appToken: this.appToken,
      tableId: this.tableId,
      types: 'selection_change',
    });

    this.eventSource = new EventSource(`${this.baseUrl}/api/feishu/events?${params}`);

    this.eventSource.onmessage = (event) => {
      try {
        const feishuEvent: FeishuEvent = JSON.parse(event.data);

        // 只处理选中变化事件
        if (feishuEvent.type === 'selection_change') {
          this.selectionChangeCallbacks.forEach(callback => {
            try {
              callback(feishuEvent);
            } catch (error) {
              console.error('[FeishuClient] 回调执行失败:', error);
            }
          });
        }
      } catch (error) {
        console.error('[FeishuClient] 解析事件失败:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('[FeishuClient] SSE 连接错误:', error);
      
      // 自动重连
      setTimeout(() => {
        this.stopEventStream();
        this.startEventStream();
      }, 3000);
    };
  }

  /**
   * 停止SSE事件流
   */
  private stopEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * 手动触发选中变化事件（用于测试或替代方案）
   */
  triggerSelectionChange(data: any): void {
    const event: FeishuEvent = {
      type: 'selection_change',
      data,
      timestamp: Date.now(),
    };

    this.selectionChangeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[FeishuClient] 回调执行失败:', error);
      }
    });
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    this.stopEventStream();
    this.selectionChangeCallbacks.clear();
    this.initialized = false;
  }
}

/**
 * 创建飞书客户端实例
 */
export function createFeishuClient(config: FeishuClientConfig): FeishuClient {
  return new FeishuClient(config);
}

/**
 * 全局客户端实例（单例模式）
 */
let globalClient: FeishuClient | null = null;

export function getFeishuClient(config?: FeishuClientConfig): FeishuClient {
  if (!globalClient && config) {
    globalClient = new FeishuClient(config);
  }

  if (!globalClient) {
    throw new Error('飞书客户端未初始化，请先调用 createFeishuClient 或传入配置');
  }

  return globalClient;
}

export function resetFeishuClient(): void {
  if (globalClient) {
    globalClient.destroy();
    globalClient = null;
  }
}
