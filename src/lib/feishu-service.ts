/**
 * 飞书服务 - 统一数据获取层
 * 
 * 根据环境自动选择：
 * 1. 飞书侧边栏环境：使用 JS-SDK (feishu-env.ts)
 * 2. 独立访问环境：使用后端 API (feishu-client.ts)
 * 
 * 核心功能：
 * - 复选框选中记录读取
 * - 字段列表获取
 * - 记录数据获取
 * 
 * 字段预读取场景限制：
 * 1. 创建模板时读取
 * 2. 进入模板编辑时读取
 * 3. 进入排版打印预览时读取
 * 4. 切换多维表格时读取
 */

import type { Field } from '@/types/editor';

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text', 2: 'number', 3: 'singleSelect', 4: 'multiSelect',
  5: 'date', 6: 'checkbox', 7: 'user', 8: 'url',
  9: 'phone', 10: 'email', 11: 'user', 12: 'formula',
  13: 'progress', 14: 'currency', 15: 'rating', 16: 'location',
  17: 'attachment', 18: 'group', 19: 'barcode',
  20: 'modifiedTime', 21: 'createdTime', 22: 'modifiedUser', 23: 'createdUser', 24: 'autoNumber',
};

// 环境类型
type Environment = 'sdk' | 'api' | 'unknown';

// ============================================
// 字段缓存机制
// ============================================

/** 字段获取场景 */
export type FieldFetchScene = 
  | 'create_template'    // 创建模板时
  | 'edit_template'      // 进入模板编辑时
  | 'print_preview'      // 进入排版打印预览时
  | 'table_switch'       // 切换多维表格时
  | 'manual_refresh';    // 手动刷新

/** 字段缓存项 */
interface FieldCache {
  fields: Field[];
  tableId: string;
  timestamp: number;
}

// 字段缓存（按 tableId 缓存）
const fieldCacheMap = new Map<string, FieldCache>();

// 缓存有效期（5分钟）
const FIELD_CACHE_DURATION = 5 * 60 * 1000;

/**
 * 获取缓存的字段
 */
function getCachedFields(targetTableId: string): Field[] | null {
  const cache = fieldCacheMap.get(targetTableId);
  if (!cache) return null;
  
  const now = Date.now();
  if (now - cache.timestamp > FIELD_CACHE_DURATION) {
    fieldCacheMap.delete(targetTableId);
    return null;
  }
  
  console.log('[FeishuService] 使用缓存字段, tableId:', targetTableId, '数量:', cache.fields.length);
  return cache.fields;
}

/**
 * 设置字段缓存
 */
function setFieldCache(targetTableId: string, fields: Field[]): void {
  fieldCacheMap.set(targetTableId, {
    fields,
    tableId: targetTableId,
    timestamp: Date.now(),
  });
  console.log('[FeishuService] 缓存字段, tableId:', targetTableId, '数量:', fields.length);
}

/**
 * 清除字段缓存
 */
export function clearFieldCache(targetTableId?: string): void {
  if (targetTableId) {
    fieldCacheMap.delete(targetTableId);
    console.log('[FeishuService] 清除字段缓存, tableId:', targetTableId);
  } else {
    fieldCacheMap.clear();
    console.log('[FeishuService] 清除所有字段缓存');
  }
}

/**
 * 判断是否应该使用缓存
 * 
 * 规则：
 * - create_template: 使用缓存（如果存在）
 * - edit_template: 强制刷新（确保数据最新）
 * - print_preview: 强制刷新（确保预览准确）
 * - table_switch: 强制刷新（新表格数据）
 * - manual_refresh: 强制刷新（用户主动操作）
 */
function shouldUseCache(scene: FieldFetchScene): boolean {
  return scene === 'create_template';
}

// ============================================
// 全局状态
// ============================================

let currentEnv: Environment = 'unknown';
let appToken: string | null = null;
let tableId: string | null = null;

/**
 * 检测当前环境
 */
export function detectEnvironment(): Environment {
  // 🔥 如果已经确定环境，直接返回
  if (currentEnv !== 'unknown') {
    return currentEnv;
  }
  
  // 检查是否在 iframe 中（飞书侧边栏环境）
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  if (inIframe) {
    // 尝试检测飞书环境
    const isFeishuEnv = typeof navigator !== 'undefined' && /lark|feishu/i.test(navigator.userAgent);
    if (isFeishuEnv) {
      currentEnv = 'sdk';
      return 'sdk';
    }
    
    // 🔥 即使 userAgent 不匹配，如果在 iframe 中，也尝试使用 SDK
    // 因为可能已经通过 initEnvironment() 初始化过了
    console.log('[FeishuService] 在 iframe 中但 userAgent 未匹配，返回当前环境:', currentEnv);
  }
  
  // 检查是否有配置的 appToken 和 tableId
  if (appToken && tableId) {
    currentEnv = 'api';
    return 'api';
  }
  
  return currentEnv;
}

/**
 * 设置 API 模式的凭证
 */
export function setApiCredentials(token: string, table: string) {
  appToken = token;
  tableId = table;
  currentEnv = 'api';
}

/**
 * 获取当前环境
 */
export function getCurrentEnvironment(): Environment {
  return currentEnv;
}

/**
 * 获取字段列表
 * 
 * 场景限制：
 * 1. create_template - 创建模板时（可使用缓存）
 * 2. edit_template - 进入模板编辑时（强制刷新）
 * 3. print_preview - 进入排版打印预览时（强制刷新）
 * 4. table_switch - 切换多维表格时（强制刷新）
 * 5. manual_refresh - 手动刷新（强制刷新）
 */
export async function fetchFields(options?: {
  scene?: FieldFetchScene;
  forceRefresh?: boolean;
}): Promise<Field[]> {
  const { scene = 'edit_template', forceRefresh = false } = options || {};
  const env = detectEnvironment();
  const targetTableId = tableId;
  
  console.log('[FeishuService] 获取字段列表, 环境:', env, '场景:', scene, '强制刷新:', forceRefresh);
  
  // 检查是否使用缓存
  if (!forceRefresh && shouldUseCache(scene) && targetTableId) {
    const cachedFields = getCachedFields(targetTableId);
    if (cachedFields) {
      return cachedFields;
    }
  }
  
  let fields: Field[];
  
  if (env === 'sdk') {
    // 使用 JS-SDK
    try {
      const { fetchFields: sdkFetchFields } = await import('./feishu-env');
      const rawFields = await sdkFetchFields();
      
      fields = rawFields.map((field: any, index: number) => ({
        id: field.id || `field_${index}`,
        name: field.name,
        type: field.type,
        placeholder: `[${field.name}]`,
        isSystem: false,
        fieldKind: getFieldKind(field.type),
      }));
    } catch (error) {
      console.error('[FeishuService] SDK 获取字段失败:', error);
      return [];
    }
  } else if (env === 'api') {
    // 使用后端 API
    try {
      const params = new URLSearchParams({
        appToken: appToken!,
        tableId: tableId!,
      });
      
      const response = await fetch(`/api/feishu/fields/?${params}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      fields = result.fields.map((field: any) => ({
        id: field.id,
        name: field.name,
        type: String(field.type),
        placeholder: `[${field.name}]`,
        isSystem: false,
        fieldKind: field.fieldKind || getFieldKind(field.type),
      }));
    } catch (error) {
      console.error('[FeishuService] API 获取字段失败:', error);
      return [];
    }
  } else {
    console.warn('[FeishuService] 未知环境，无法获取字段');
    return [];
  }
  
  // 缓存字段
  if (targetTableId && fields.length > 0) {
    setFieldCache(targetTableId, fields);
  }
  
  return fields;
}

/**
 * 获取记录列表
 */
export async function fetchRecords(options?: {
  recordIds?: string[];
  processFields?: boolean;
}): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  console.log('[FeishuService] 获取记录, 环境:', env, 'recordIds:', options?.recordIds?.length || 0);
  
  if (env === 'sdk') {
    // 使用 JS-SDK
    try {
      const { base } = await import('@lark-base-open/js-sdk');
      
      // 🔥 获取 tableId
      let targetTableId = tableId;
      if (!targetTableId) {
        try {
          const selection = await base.getSelection();
          targetTableId = selection?.tableId || null;
          console.log('[FeishuService] 从 selection 获取 tableId:', targetTableId);
        } catch (e) {
          console.error('[FeishuService] 获取 tableId 失败:', e);
        }
      }
      
      let rawRecords: Array<{ id: string; fields: Record<string, unknown> }> = [];
      
      // 🔥 如果指定了 recordIds，需要使用批量获取
      if (options?.recordIds && options.recordIds.length > 0) {
        const { getRecordsByCheckboxIds } = await import('./feishu-env');
        
        if (targetTableId) {
          console.log('[FeishuService] 批量获取记录, tableId:', targetTableId, 'recordIds:', options.recordIds);
          rawRecords = await getRecordsByCheckboxIds(targetTableId, options.recordIds);
          console.log('[FeishuService] 批量获取到记录数:', rawRecords.length);
        } else {
          console.warn('[FeishuService] 无法获取 tableId，跳过批量获取');
        }
      } else {
        // 默认获取所有记录
        const { fetchRecords: sdkFetchRecords } = await import('./feishu-env');
        rawRecords = await sdkFetchRecords();
      }
      
      // 🔥【关键修复】处理附件字段
      if (rawRecords.length > 0 && targetTableId) {
        try {
          console.log('[FeishuService] ========== 开始处理附件字段 ==========');
          
          const table = await base.getTable(targetTableId);
          const fieldMetaList = await table.getFieldMetaList();
          
          // 查找附件字段
          const attachmentFields = fieldMetaList?.filter((f: any) => f.type === 17 || String(f.type) === 'Attachment') || [];
          console.log('[FeishuService] 发现附件字段数:', attachmentFields.length);
          
          if (attachmentFields.length > 0) {
            // 导入附件处理函数
            const { processRecordAttachments } = await import('./attachment-processor');
            
            // 处理每条记录的附件
            const processedRecords = await Promise.all(
              rawRecords.map(async (record) => {
                try {
                  const result = await processRecordAttachments(
                    { id: record.id, ...record.fields } as Record<string, any>,
                    fieldMetaList,
                    undefined, // fieldTypeMap
                    table
                  );
                  return result as typeof record;
                } catch (error) {
                  console.error('[FeishuService] 处理记录附件失败:', record.id, error);
                  return record;
                }
              })
            );
            
            console.log('[FeishuService] ========== 附件字段处理完成 ==========');
            
            // 验证处理结果
            const htmlFields = processedRecords[0] ? Object.keys(processedRecords[0]).filter(k => k.endsWith('_html')) : [];
            console.log('[FeishuService] 处理后记录的 _html 字段:', htmlFields);
            
            return processedRecords.map(r => ({ id: r.id, ...r.fields }));
          }
        } catch (attachmentError) {
          console.error('[FeishuService] 附件处理失败:', attachmentError);
          // 继续返回原始记录
        }
      }
      
      return rawRecords.map(r => ({ id: r.id, ...r.fields }));
    } catch (error) {
      console.error('[FeishuService] SDK 获取记录失败:', error);
      return [];
    }
  }
  
  if (env === 'api') {
    // 使用后端 API
    try {
      const response = await fetch('/api/feishu/records/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appToken,
          tableId,
          recordIds: options?.recordIds,
          processFields: options?.processFields ?? true,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.records.map((r: any) => ({
        id: r.id,
        ...r.fields,
      }));
    } catch (error) {
      console.error('[FeishuService] API 获取记录失败:', error);
      return [];
    }
  }
  
  console.warn('[FeishuService] 未知环境，无法获取记录');
  return [];
}

/**
 * 获取选中记录（SDK 模式专用）
 */
export async function getSelectedRecords(): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    try {
      const { getSelectedRecords: sdkGetSelectedRecords } = await import('./feishu-env');
      const records = await sdkGetSelectedRecords();
      return records.map(r => ({ id: r.id, ...r.fields }));
    } catch (error) {
      console.error('[FeishuService] SDK 获取选中记录失败:', error);
      return [];
    }
  }
  
  // API 模式下需要前端传递选中的 recordIds
  console.warn('[FeishuService] API 模式下请使用 fetchRecords({ recordIds: [...] })');
  return [];
}

/**
 * 初始化环境
 */
export async function initEnvironment(config?: {
  appToken?: string;
  tableId?: string;
}): Promise<{ success: boolean; tableName?: string; tableId?: string }> {
  console.log('[FeishuService] initEnvironment 被调用, config:', config);
  
  // 如果提供了凭证，设置 API 模式
  if (config?.appToken && config?.tableId) {
    setApiCredentials(config.appToken, config.tableId);
    
    // 验证凭证并获取表格信息
    try {
      const response = await fetch('/api/feishu/init/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appToken: config.appToken,
          tableId: config.tableId,
        }),
      });
      
      const result = await response.json();
      return {
        success: result.success,
        tableName: result.tableName,
        tableId: config.tableId,
      };
    } catch (error) {
      console.error('[FeishuService] 初始化失败:', error);
      return { success: false };
    }
  }
  
  // 否则尝试初始化 SDK 环境
  try {
    console.log('[FeishuService] 尝试初始化 SDK 环境...');
    const { initFeishuEnv } = await import('./feishu-env');
    const success = await initFeishuEnv();
    console.log('[FeishuService] initFeishuEnv 返回:', success);
    if (success) {
      currentEnv = 'sdk';
      console.log('[FeishuService] 当前环境设置为: sdk');
      
      // 🔥 在 SDK 模式下，获取并缓存 tableId 和 appToken（baseId）
      try {
        const { base } = await import('@lark-base-open/js-sdk');
        const selection = await base.getSelection();
        if (selection?.tableId) {
          tableId = selection.tableId;
          console.log('[FeishuService] 缓存 tableId:', tableId);
        }
        if (selection?.baseId) {
          appToken = selection.baseId; // 在 SDK 模式下，baseId 作为 appToken
          console.log('[FeishuService] 缓存 appToken (baseId):', appToken);
        }
      } catch (error) {
        console.error('[FeishuService] 获取 selection 失败:', error);
      }
    }
    return { success, tableId: tableId || undefined };
  } catch (error) {
    console.error('[FeishuService] SDK 初始化失败:', error);
    return { success: false };
  }
}

/**
 * 获取表格名称
 */
export async function fetchTableName(): Promise<string> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    try {
      const { fetchTableName: sdkFetchTableName } = await import('./feishu-env');
      return await sdkFetchTableName();
    } catch (error) {
      console.error('[FeishuService] SDK 获取表格名称失败:', error);
      return '未命名表格';
    }
  }
  
  if (env === 'api') {
    try {
      const response = await fetch('/api/feishu/init/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appToken: appToken!,
          tableId: tableId!,
        }),
      });
      
      const result = await response.json();
      return result.tableName || '未命名表格';
    } catch (error) {
      console.error('[FeishuService] API 获取表格名称失败:', error);
      return '未命名表格';
    }
  }
  
  return '未命名表格';
}

/**
 * 获取当前选中的表格 ID
 */
export async function getCurrentTableIdAsync(): Promise<string | null> {
  const env = detectEnvironment();
  
  // 如果已经缓存了 tableId，直接返回
  if (tableId) {
    return tableId;
  }
  
  // SDK 模式下，从 SDK 获取
  if (env === 'sdk') {
    try {
      const { base } = await import('@lark-base-open/js-sdk');
      const selection = await base.getSelection();
      if (selection?.tableId) {
        tableId = selection.tableId;
        return tableId;
      }
    } catch (error) {
      console.error('[FeishuService] 获取 tableId 失败:', error);
    }
  }
  
  return tableId;
}

/**
 * 获取当前选中的表格 ID（同步版本，返回缓存值）
 */
export function getCurrentTableId(): string | null {
  return tableId;
}

/**
 * 获取当前 appToken（同步版本，返回缓存值）
 */
export function getCurrentAppToken(): string | null {
  return appToken;
}

/**
 * 检查是否在飞书环境中
 */
export function isFeishuEnvironment(): boolean {
  return detectEnvironment() !== 'unknown';
}

/**
 * 根据字段类型获取字段种类
 */
function getFieldKind(type: number | string): Field['fieldKind'] {
  const typeStr = String(type);
  const typeNum = typeof type === 'number' ? type : parseInt(typeStr, 10);
  
  // 附件类型
  if (typeNum === 17 || typeStr === 'attachment') {
    return 'attachment';
  }
  
  // 人员类型
  if (typeNum === 11 || typeNum === 7 || typeStr === 'user' || typeStr === 'person') {
    return 'person';
  }
  
  // 文本类型
  if (typeNum === 1 || typeStr === 'text') {
    return 'text';
  }
  
  // 数字类型
  if (typeNum === 2 || typeStr === 'number') {
    return 'number';
  }
  
  // 日期类型
  if (typeNum === 5 || typeStr === 'date') {
    return 'date';
  }
  
  return 'other';
}

// ============================================
// 轮询选择检测
// ============================================

/** 选择变化事件 */
export interface SelectionPollingEvent {
  tableId: string;
  recordIds: string[];
  isSelectAll: boolean;
}

/**
 * 启动选择状态轮询
 * @param interval 轮询间隔（毫秒），默认 1000ms
 */
export async function startSelectionPolling(interval: number = 1000): Promise<void> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    const { startSelectionPolling: sdkStartPolling } = await import('./feishu-env');
    sdkStartPolling(interval);
  } else {
    console.warn('[FeishuService] API 模式不支持选择轮询');
  }
}

/**
 * 停止选择状态轮询
 */
export async function stopSelectionPolling(): Promise<void> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    const { stopSelectionPolling: sdkStopPolling } = await import('./feishu-env');
    sdkStopPolling();
  }
}

/**
 * 注册选择变化回调
 * @param callback 选择变化时的回调函数
 * @returns 取消注册的函数
 */
export async function onSelectionPollingChange(
  callback: (event: SelectionPollingEvent) => void
): Promise<() => void> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    const { onSelectionPollingChange: sdkOnChange } = await import('./feishu-env');
    return sdkOnChange(callback);
  }
  
  // 非SDK环境返回空函数
  return () => {};
}

// 导出类型
export type { Field };
