/**
 * 飞书 SDK 环境 - 增强版（整合新 SDK 逻辑）
 * 
 * 核心改进：
 * 1. 使用 bitable.bridge.onReady() 异步回调判断环境
 * 2. 不再依赖同步的 window.lark 检测
 * 3. 提供统一的状态管理和错误处理
 * 4. 添加回调移除机制，防止内存泄漏和重复调用
 * 5. 新增：选中变化监听器（onSelectionChange）
 * 6. 新增：详细的调试日志系统
 * 7. 新增：方案A实现（getTableById + getRecordById）
 */

import { bitable, base } from '@lark-base-open/js-sdk';

// 调试日志系统
// ============================================
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[FeishuEnv][${timestamp}] ${message}`, data || '');
}

// ============================================
// 类型定义
// ============================================

// 字段信息接口
interface FieldInfo {
  id: string;
  name: string;
  type: string;
}

// 应用元数据接口
interface AppMetadata {
  appId: string;
  name: string;
  defaultTableId: string;
  description?: string;
}

// 全局上下文接口
export interface FeishuContext {
  appToken: string;
  targetTableId: string;
  fieldNameToIdMap: Record<string, string>;
  firstRecordData: Record<string, unknown> | null;
  appMetadata: AppMetadata | null;
}

// 选中信息接口
interface SelectionInfo {
  baseId: string | null;
  fieldId: string | null;
  recordId: string | null;
  tableId: string | null;
  viewId: string | null;
}

// 选中变化事件接口
interface SelectionChangeEvent {
  data: SelectionInfo;
}

// 环境状态类型
export type FeishuEnvStatus = 'checking' | 'ready' | 'not_feishu' | 'error';

// 记录类型
interface BitableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  lastModifiedTime: string;
}

// ============================================
// 全局状态
// ============================================

let envStatus: FeishuEnvStatus = 'checking';
let envError: string | null = null;
let onReadyCallbacks: Set<() => void> = new Set();
let onNotFeishuCallbacks: Set<() => void> = new Set();
let onSelectionChangeCallbacks: Set<(event: SelectionChangeEvent) => void> = new Set();
let initPromise: Promise<boolean> | null = null;
let isInitialized = false;
let selectionUnsubscribe: (() => void) | null = null;

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text', 2: 'number', 3: 'singleSelect', 4: 'multiSelect',
  5: 'date', 6: 'checkbox', 7: 'user', 8: 'url',
  9: 'phone', 10: 'email', 
  11: 'user', // 🔥 修复：11 是人员（User），不是 attachment
  12: 'formula',
  13: 'progress', 14: 'currency', 15: 'rating', 16: 'location',
  17: 'attachment', // 🔥 修复：17 是附件（Attachment），不是 relation
  18: 'group', 19: 'barcode', 
  20: 'modifiedTime', 21: 'createdTime', 22: 'modifiedUser', 23: 'createdUser', 24: 'autoNumber',
};

// ============================================
// 基础状态查询函数
// ============================================

export function getEnvStatus(): FeishuEnvStatus {
  return envStatus;
}

export function getEnvError(): string | null {
  return envError;
}

export function isFeishuEnvironment(): boolean {
  return envStatus === 'ready';
}

// ============================================
// 回调管理函数
// ============================================

export function onFeishuReady(callback: () => void): () => void {
  if (envStatus === 'ready') {
    callback();
    return () => {};
  }
  onReadyCallbacks.add(callback);
  return () => { onReadyCallbacks.delete(callback); };
}

export function offFeishuReady(callback: () => void): void {
  onReadyCallbacks.delete(callback);
}

export function onNotFeishu(callback: () => void): () => void {
  if (envStatus === 'not_feishu') {
    callback();
    return () => {};
  }
  onNotFeishuCallbacks.add(callback);
  return () => { onNotFeishuCallbacks.delete(callback); };
}

export function offNotFeishu(callback: () => void): void {
  onNotFeishuCallbacks.delete(callback);
}

// ============================================
// 新增：复选框勾选变化监听
// ============================================

type RecordSelectChangeEvent = {
  data: {
    tableId: string;
    recordIds: string[];
    isSelectAll: boolean;
  };
};


// ============================================
// 新增：调试和环境检查
// ============================================

async function debugEnvironment() {
  // 简化日志输出，只在初始化时输出一次关键信息
  try {
    const hasUiApi = !!(bitable as any).ui;
    const hasGetSelectRecordIds = hasUiApi && typeof (bitable as any).ui?.getSelectRecordIds === 'function';
    
    debugLog('SDK 检查:', {
      hasUiApi,
      hasGetSelectRecordIds,
      hasGetSelection: typeof base.getSelection === 'function',
    });
  } catch (error) {
    // 静默处理错误
  }
}

function checkEnvironment() {
  // 简化环境检查，只输出关键信息
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isFeishuEnv = typeof navigator !== 'undefined' && /lark|feishu/i.test(navigator.userAgent);
  
  debugLog('环境检查:', { inIframe, isFeishuEnv });
}

// ============================================

export function onSelectionChange(callback: (event: SelectionChangeEvent) => void): () => void {
  debugLog('注册选中变化监听器');
  onSelectionChangeCallbacks.add(callback);
  
  // 如果还没设置监听器，现在设置
  if (!selectionUnsubscribe && envStatus === 'ready') {
    setupSelectionListener();
  }
  
  return () => {
    debugLog('移除选中变化监听器');
    onSelectionChangeCallbacks.delete(callback);
  };
}

// 新增：探索所有可用事件
function exploreAllEvents() {
  debugLog('======== 探索飞书 SDK 所有可用事件 ========');
  
  try {
    // 探索 bitable.base
    if (bitable.base) {
      debugLog('bitable.base 可用方法:', Object.keys(bitable.base));
      
      // 查找所有 on 开头的方法
      const allMethods = Object.keys(bitable.base);
      const eventMethods = allMethods.filter(key => key.startsWith('on'));
      debugLog('bitable.base 事件方法:', eventMethods);
    }
    
    // 探索 bitable
    if (bitable) {
      debugLog('bitable 可用方法:', Object.keys(bitable));
      
      const allMethods = Object.keys(bitable);
      const eventMethods = allMethods.filter(key => key.startsWith('on'));
      debugLog('bitable 事件方法:', eventMethods);
    }
  } catch (e) {
    debugLog('探索事件失败:', e);
  }
}

function setupSelectionListener() {
  if (selectionUnsubscribe) {
    debugLog('选中监听器已存在，跳过');
    return;
  }
  
  try {
    debugLog('======== 设置选中变化监听器 ========');
    
    // 先探索所有可用事件
    exploreAllEvents();
    
    // ⚠️ 重要说明：
    // base.onSelectionChange 只在点击单元格/行时触发
    // 不会在复选框勾选时触发（这是飞书 SDK 限制）
    
    if (typeof (bitable.base as any).onSelectionChange === 'function') {
      selectionUnsubscribe = (bitable.base as any).onSelectionChange((event: SelectionChangeEvent) => {
        console.log('🎯 base.onSelectionChange 事件触发!');
        console.log('📋 事件数据:', {
          tableId: event?.data?.tableId,
          recordId: event?.data?.recordId,
          fieldId: event?.data?.fieldId,
        });
        
        // 🔥 同时触发轮询回调（统一处理）
        const recordId = event?.data?.recordId;
        const tableId = event?.data?.tableId;
        
        if (recordId && tableId) {
          const pollingEvent = {
            tableId: tableId,
            recordIds: [recordId],
            isSelectAll: false,
          };
          
          // 通知轮询回调
          onSelectionPollingCallbacks.forEach(cb => {
            try {
              cb(pollingEvent);
            } catch (e) {
              console.error('[FeishuEnv] 轮询回调执行失败:', e);
            }
          });
        }
        
        // 通知所有注册的回调
        onSelectionChangeCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 选中变化回调执行失败:', e);
          }
        });
      });
      
      console.log('✅ base.onSelectionChange 监听器设置成功');
    } else if (typeof (bitable as any).onSelectionChange === 'function') {
      selectionUnsubscribe = (bitable as any).onSelectionChange((event: SelectionChangeEvent) => {
        console.log('🎯 bitable.onSelectionChange 事件触发!');
        console.log('📋 事件数据:', event);
        
        // 通知所有注册的回调
        onSelectionChangeCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 选中变化回调执行失败:', e);
          }
        });
      });
      
      console.log('✅ bitable.onSelectionChange 监听器设置成功');
    } else {
      console.warn('⚠️  不支持 onSelectionChange，将使用轮询方案');
    }
  } catch (error) {
    console.error('❌ 设置选中监听器失败:', error);
  }
}

// ============================================
// 初始化飞书环境
// ============================================

export async function initFeishuEnv(): Promise<boolean> {
  if (isInitialized && initPromise) {
    return initPromise;
  }
  
  isInitialized = true;
  debugLog('======== 开始环境检测 ========');

  initPromise = (async () => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    debugLog('inIframe:', inIframe);

    if (!inIframe) {
      envStatus = 'not_feishu';
      envError = '不在 iframe 中';
      debugLog('不在 iframe 中，判定为非飞书环境');
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }

    try {
      debugLog('尝试初始化 SDK...');
      
      const timeout = 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('SDK 初始化超时')), timeout);
      });

      const initSdk = async () => {
        debugLog('📍 初始化中调用 base.getSelection()...');
        const selection = await base.getSelection();
        
        // 🔍 输出完整的返回对象
        debugLog('📍 base.getSelection() 完整返回:');
        debugLog('  - baseId:', selection?.baseId);
        debugLog('  - tableId:', selection?.tableId);
        debugLog('  - viewId:', selection?.viewId);
        debugLog('  - recordId:', selection?.recordId);
        debugLog('  - fieldId:', selection?.fieldId);
        debugLog('📍 原始对象:', JSON.stringify(selection, null, 2));
        
        return selection;
      };

      await Promise.race([initSdk(), timeoutPromise]);

      envStatus = 'ready';
      debugLog('✅ SDK 初始化成功，飞书环境已就绪');
      
      // 设置选中变化监听器
      setupSelectionListener();
      
      // 初始化完成后进行一次完整的环境调试
      debugLog('初始化完成，执行环境调试...');
      await debugEnvironment();
      
      onReadyCallbacks.forEach(cb => cb());
      return true;

    } catch (error) {
      debugLog('⚠️  SDK 初始化失败:', error);
      
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const urlHasFeishu = url.includes('feishu.cn') || 
                           url.includes('larksuite.com') ||
                           url.includes('bytedance');

      if (urlHasFeishu) {
        envStatus = 'error';
        envError = `SDK 初始化失败: ${error}`;
        debugLog('URL 包含飞书域名，但 SDK 未就绪');
        return false;
      }

      envStatus = 'not_feishu';
      envError = 'SDK 初始化失败';
      debugLog('判定为非飞书环境');
      
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }
  })();

  return initPromise;
}

// ============================================
// 数据获取函数（保持原有接口）
// ============================================

export async function fetchFields(): Promise<Array<{
  id: string;
  name: string;
  type: string;
}>> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取字段');
    return [];
  }

  try {
    const selection = await base.getSelection();
    debugLog('selection:', selection);
    
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    debugLog('table:', !!table);
    
    debugLog('开始获取字段数据...');
    const rawFields = await table.getFieldList();
    debugLog('原始字段数量:', rawFields.length);
    
    const fields: FieldInfo[] = [];
    for (let index = 0; index < rawFields.length; index++) {
      const field = rawFields[index];
      
      try {
        const name = await field.getName();
        const type = await field.getType();
        const meta = await field.getMeta();
        
        const mappedType = FIELD_TYPE_MAP[type] || 'text';
        
        fields.push({
          id: meta.id || `field_${index}`,
          name: name || `字段${index + 1}`,
          type: mappedType,
        });
      } catch (error) {
        debugLog(`获取字段 ${index} 信息失败:`, error);
        fields.push({
          id: `field_${index}`,
          name: `字段${index + 1}`,
          type: 'text',
        });
      }
    }
    
    debugLog('最终返回的字段列表:', fields);
    return fields;
  } catch (error) {
    debugLog('获取字段失败:', error);
    return [];
  }
}

export async function fetchRecords(): Promise<Array<{
  id: string;
  fields: Record<string, unknown>;
}>> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取记录');
    return [];
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    
    const recordIdList = await table.getRecordIdList();
    debugLog('获取到记录 ID 数量:', recordIdList?.length || 0);
    
    if (!Array.isArray(recordIdList) || recordIdList.length === 0) {
      return [];
    }

    const limit = Math.min(recordIdList.length, 100);
    const records: Array<{ id: string; fields: Record<string, unknown> }> = [];
    
    for (let i = 0; i < limit; i++) {
      try {
        const recordId = recordIdList[i];
        const record = await table.getRecordById(recordId);
        if (record) {
          records.push({
            id: recordId,
            fields: record.fields || {},
          });
        }
      } catch (e) {
        debugLog(`获取第 ${i} 条记录失败:`, e);
      }
    }

    debugLog('成功获取记录数:', records.length);
    return records;
  } catch (error) {
    debugLog('获取记录失败:', error);
    return [];
  }
}

// ============================================
// 新增：获取选中记录（方案A实现）
// ============================================

// ============================================
// 新增：通过复选框勾选的记录 IDs 获取数据
// ============================================

export async function getRecordsByCheckboxIds(tableId: string, recordIds: string[]): Promise<BitableRecord[]> {
  debugLog('======== getRecordsByCheckboxIds() 开始 ========');
  debugLog('tableId:', tableId);
  debugLog('recordIds:', recordIds);
  
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，返回空数组');
    return [];
  }

  if (!tableId || !Array.isArray(recordIds) || recordIds.length === 0) {
    debugLog('参数无效，返回空数组');
    return [];
  }

  try {
    debugLog('第一步：通过 tableId 获取表格...');
    let table: any = null;
    
    if (typeof base.getTableById === 'function') {
      debugLog('使用 base.getTableById()');
      table = await base.getTableById(tableId);
    } else {
      debugLog('回退到 base.getTable()');
      table = await base.getTable(tableId);
    }
    
    if (!table) {
      debugLog('❌ 无法获取表格实例');
      return [];
    }
    
    debugLog('✅ 表格获取成功');
    
    // 第二步：获取字段元信息（只获取一次）
    debugLog('第二步：获取字段元信息...');
    let fieldMetaList: any[] = [];
    
    if (typeof table.getFieldMetaList === 'function') {
      fieldMetaList = await table.getFieldMetaList();
    } else if (typeof table.getFieldList === 'function') {
      fieldMetaList = await table.getFieldList();
    }
    
    // 第三步：批量获取记录
    debugLog('第三步：批量获取记录...');
    let recordsData: any[] = [];
    
    // 尝试使用 getRecordsByIds 批量获取
    if (typeof table.getRecordsByIds === 'function') {
      debugLog('使用 table.getRecordsByIds() 批量获取');
      try {
        const rawRecordsData = await table.getRecordsByIds(recordIds);
        debugLog(`✅ 批量获取到 ${rawRecordsData.length} 条记录`);
        
        // 🔥【关键修复】飞书 SDK getRecordsByIds 返回的记录没有 id 字段
        // 需要手动将 recordId 添加到每条记录中
        recordsData = rawRecordsData.map((rec: any, idx: number) => ({
          ...rec,
          id: rec.id || rec.recordId || recordIds[idx] || '', // 使用原始 recordId
        }));
        debugLog('已为每条记录添加 id 字段');
      } catch (e) {
        debugLog('⚠️  getRecordsByIds 失败，回退到逐个获取:', e);
      }
    }
    
    // 如果批量获取失败或不可用，逐个获取
    if (recordsData.length === 0) {
      debugLog('逐个获取记录...');
      for (const recId of recordIds) {
        try {
          let recData: any = null;
          if (typeof table.getRecordById === 'function') {
            recData = await table.getRecordById(recId);
          } else {
            recData = await table.getRecord(recId);
          }
          
          if (recData) {
            // 🔥【关键修复】确保记录有 id 字段
            recordsData.push({
              ...recData,
              id: recData.id || recData.recordId || recId,
            });
          }
        } catch (e) {
          debugLog(`获取记录 ${recId} 失败:`, e);
        }
      }
    }
    
    // 第四步：处理数据
    debugLog('第四步：处理数据...');
    const records: BitableRecord[] = [];
    
    for (const recData of recordsData) {
      const processedRecord = processRecordData(recData, fieldMetaList);
      records.push(processedRecord);
    }
    
    // 🔥【关键修复】第五步：处理附件字段 - 获取临时 URL 并生成 HTML
    debugLog('第五步：处理附件字段...');
    const attachmentFields = fieldMetaList?.filter((f: any) => f.type === 17) || [];
    debugLog('发现附件字段数:', attachmentFields.length);
    
    if (attachmentFields.length > 0 && records.length > 0) {
      try {
        for (const attachField of attachmentFields) {
          const fieldId = attachField.id;
          const fieldName = attachField.name;
          debugLog(`处理附件字段: ${fieldName} (${fieldId})`);
          
          for (const record of records) {
            const attachValue = record.fields[fieldName];
            if (Array.isArray(attachValue) && attachValue.length > 0) {
              debugLog(`记录 ${record.id} 的附件字段 ${fieldName} 有 ${attachValue.length} 个文件`);
              
              // 提取 token 列表，并过滤掉 null/undefined/空字符串
              const tokens = attachValue
                .map((a: any) => a?.token || a?.file_token || null)
                .filter((t): t is string => typeof t === 'string' && t.length > 0);
              
              if (tokens.length > 0) {
                debugLog(`获取 ${tokens.length} 个附件的临时 URL...`);
                
                try {
                  // 获取附件字段实例并获取临时 URL
                  const attachmentField = await table.getField(fieldId);
                  
                  // 🔥【关键修复】使用 recordId 而不是 tokens 数组调用 getAttachmentUrls
                  // 因为飞书 SDK 的 getAttachmentUrls 可能对 tokens 数组处理有问题
                  const recordId = record.id;
                  if (!recordId) {
                    debugLog(`记录没有 ID，跳过附件处理`);
                    continue;
                  }
                  
                  const urls = await attachmentField.getAttachmentUrls(recordId);
                  
                  debugLog(`获取到 ${urls?.length || 0} 个临时 URL`);
                  
                  if (urls && Array.isArray(urls) && urls.length > 0) {
                    // 生成 HTML 内容
                    const images = urls.map((url: string, idx: number) => {
                      const fileName = attachValue[idx]?.name || '';
                      return `<img src="${url}" alt="${fileName}" style="max-width: 100px; margin: 4px; display: inline-block;"/>`;
                    }).join('');
                    
                    // 存储 _html 字段
                    record.fields[`_${fieldName}_html`] = `<div class="attachment-images">${images}</div>`;
                    debugLog(`生成 _${fieldName}_html 字段`);
                  }
                } catch (urlError) {
                  debugLog(`获取附件 URL 失败:`, urlError);
                }
              }
            }
          }
        }
      } catch (attachError) {
        debugLog('附件处理失败:', attachError);
      }
    }
    
    // 验证处理结果
    if (records.length > 0) {
      const htmlFields = Object.keys(records[0].fields).filter(k => k.endsWith('_html'));
      debugLog('处理后记录的 _html 字段:', htmlFields);
    }
    
    debugLog(`✅ 数据处理完成，共 ${records.length} 条记录`);
    debugLog('======== getRecordsByCheckboxIds() 结束 ========');
    
    return records;
  } catch (error) {
    debugLog('❌ getRecordsByCheckboxIds() 失败:', error);
    debugLog('错误堆栈:', error instanceof Error ? error.stack : error);
    debugLog('======== getRecordsByCheckboxIds() 结束 ========');
    return [];
  }
}

// ============================================
// 获取选中记录（点击行选择）
// ============================================

export async function getSelectedRecords(): Promise<BitableRecord[]> {
  debugLog('======== getSelectedRecords() 开始 ========');
  
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，返回空数组');
    return [];
  }

  try {
    debugLog('第一步：调用 base.getSelection() 获取选中信息...');
    const selection = await base.getSelection();
    
    // 🔍 输出完整的返回对象
    debugLog('📍 base.getSelection() 完整返回:');
    debugLog('  - baseId:', selection?.baseId);
    debugLog('  - tableId:', selection?.tableId);
    debugLog('  - viewId:', selection?.viewId);
    debugLog('  - recordId:', selection?.recordId);
    debugLog('  - fieldId:', selection?.fieldId);
    debugLog('📍 原始对象:', JSON.stringify(selection, null, 2));
    
    // 至少需要 tableId
    if (!selection?.tableId) {
      debugLog('⚠️  没有 tableId，返回空数组');
      return [];
    }
    
    const { tableId, recordId } = selection;
    debugLog('✅ 获取到 tableId:', tableId);
    
    debugLog('第二步：通过 tableId 获取表格...');
    let table: any = null;
    
    if (typeof base.getTableById === 'function') {
      table = await base.getTableById(tableId);
    } else {
      table = await base.getTable(tableId);
    }
    
    if (!table) {
      debugLog('❌ 无法获取表格实例');
      return [];
    }
    
    debugLog('第三步：获取记录...');
    let targetRecordId: string | null = recordId;
    
    // 如果没有 recordId，获取第一条记录
    if (!targetRecordId) {
      debugLog('没有 recordId，获取第一条记录...');
      const recordIdList = await table.getRecordIdList();
      
      if (Array.isArray(recordIdList) && recordIdList.length > 0) {
        targetRecordId = recordIdList[0];
        debugLog('第一条记录 ID:', targetRecordId);
      } else {
        debugLog('⚠️  表格没有记录');
        return [];
      }
    }
    
    // 获取记录数据
    debugLog('获取记录数据，recordId:', targetRecordId);
    let recordData: any = null;
    
    if (typeof table.getRecordById === 'function') {
      recordData = await table.getRecordById(targetRecordId);
    } else {
      recordData = await table.getRecord(targetRecordId);
    }
    
    if (!recordData) {
      debugLog('❌ 无法获取记录数据');
      return [];
    }
    
    // 打印完整的记录数据结构
    debugLog('📋 完整记录对象键:', Object.keys(recordData));
    debugLog('📋 记录 fields 键:', Object.keys(recordData.fields || {}));
    debugLog('📋 完整 recordData:', JSON.stringify(recordData, null, 2));
    
    // 尝试获取流程字段的值（Type 0）
    debugLog('尝试获取流程字段的值...');
    try {
      // 直接使用已获取的 recordData，不再额外调用 API
      const statusFieldId = 'fldwMmazk5'; // 当前状态字段ID
      debugLog('尝试读取流程字段:', statusFieldId);
      
      // 直接从 recordData.fields 读取字段值
      const statusValue = recordData.fields[statusFieldId];
      debugLog('流程字段原始值:', statusValue);
      debugLog('流程字段类型:', typeof statusValue);
      
      // 如果字段值是数组，打印数组内容
      if (Array.isArray(statusValue)) {
        debugLog('流程字段是数组，长度:', statusValue.length);
        statusValue.forEach((item, index) => {
          debugLog(`  [${index}]:`, JSON.stringify(item));
        });
      }
      
      // 如果获取到值，保持不变；如果为空，记录日志
      if (statusValue !== undefined && statusValue !== null) {
        debugLog('✅ 成功读取流程字段值:', statusValue);
      } else {
        debugLog('⚠️ 流程字段值为空或不存在');
      }
    } catch (e) {
      debugLog('获取流程字段值失败:', e);
    }
    
    debugLog('第四步：获取字段元信息...');
    let fieldMetaList: any[] = [];
    
    try {
      if (typeof table.getFieldMetaList === 'function') {
        fieldMetaList = await table.getFieldMetaList();
        debugLog('通过 getFieldMetaList 获取到字段数:', fieldMetaList.length);
      } else if (typeof table.getFieldList === 'function') {
        fieldMetaList = await table.getFieldList();
        debugLog('通过 getFieldList 获取到字段数:', fieldMetaList.length);
      }
      
      // 打印每个字段的详细信息以便调试
      debugLog('字段元信息详情:');
      fieldMetaList.forEach((field, index) => {
        debugLog(`  [${index}] ID: ${field.id}, Name: ${field.name}, Type: ${field.type}, Typeof: ${typeof field.type}`);
      });
    } catch (e) {
      debugLog('获取字段元信息失败:', e);
    }
    
    debugLog('第五步：处理数据...');
    debugLog('📋 完整原始记录数据:', JSON.stringify(recordData, null, 2));
    
    // 确保记录数据包含 ID（飞书 SDK 返回的数据可能没有 id 字段）
    const recordDataWithId = {
      ...recordData,
      id: recordData.id || recordData.recordId || targetRecordId,
    };
    
    const result = processRecordData(recordDataWithId, fieldMetaList);
    debugLog('✅ processRecordData 完成');
    
    // 🔥【关键修复】第六步：处理附件字段 - 获取临时 URL 并生成 HTML
    debugLog('第六步：处理附件字段...');
    const attachmentFields = fieldMetaList?.filter((f: any) => f.type === 17) || [];
    debugLog('发现附件字段数:', attachmentFields.length);
    
    if (attachmentFields.length > 0) {
      for (const attachField of attachmentFields) {
        const fieldId = attachField.id;
        const fieldName = attachField.name;
        debugLog(`处理附件字段: ${fieldName} (${fieldId})`);
        
        const attachValue = result.fields[fieldName];
        if (Array.isArray(attachValue) && attachValue.length > 0) {
          debugLog(`记录的附件字段 ${fieldName} 有 ${attachValue.length} 个文件`);
          
          // 提取 token 列表，并过滤掉 null/undefined/空字符串
          const tokens = attachValue
            .map((a: any) => a?.token || a?.file_token || null)
            .filter((t): t is string => typeof t === 'string' && t.length > 0);
          
          if (tokens.length > 0) {
            debugLog(`获取 ${tokens.length} 个附件的临时 URL...`);
            
            try {
              // 获取附件字段实例并获取临时 URL
              const attachmentField = await table.getField(fieldId);
              
              // 🔥【关键修复】使用 recordId 而不是 tokens 数组调用 getAttachmentUrls
              // 因为飞书 SDK 的 getAttachmentUrls 可能对 tokens 数组处理有问题
              const recordId = result.id;
              if (!recordId) {
                debugLog(`记录没有 ID，跳过附件处理`);
                continue;
              }
              
              const urls = await attachmentField.getAttachmentUrls(recordId);
              
              debugLog(`获取到 ${urls?.length || 0} 个临时 URL`);
              
              if (urls && Array.isArray(urls) && urls.length > 0) {
                // 生成 HTML 内容
                const images = urls.map((url: string, idx: number) => {
                  const fileName = attachValue[idx]?.name || '';
                  return `<img src="${url}" alt="${fileName}" style="max-width: 100px; margin: 4px; display: inline-block;"/>`;
                }).join('');
                
                // 存储 _html 字段
                result.fields[`_${fieldName}_html`] = `<div class="attachment-images">${images}</div>`;
                debugLog(`生成 _${fieldName}_html 字段`);
              }
            } catch (urlError) {
              debugLog(`获取附件 URL 失败:`, urlError);
            }
          }
        }
      }
    }
    
    debugLog('✅ 数据处理完成');
    debugLog('======== getSelectedRecords() 结束 ========');
    
    return [result];
  } catch (error) {
    debugLog('❌ getSelectedRecords() 失败:', error);
    debugLog('错误堆栈:', error instanceof Error ? error.stack : error);
    debugLog('======== getSelectedRecords() 结束 ========');
    return [];
  }
}

// 字段类型常量（根据飞书开放平台文档）
const FIELD_TYPES = {
  TEXT: 1,           // 文本
  NUMBER: 2,         // 数字
  SINGLE_SELECT: 3,   // 单选
  MULTI_SELECT: 4,    // 多选
  DATETIME: 5,       // 日期
  CHECKBOX: 7,       // 复选框
  USER: 11,          // 人员
  PHONE: 13,         // 电话号码
  URL: 15,           // 超链接
  ATTACHMENT: 17,     // 附件
  SINGLE_LINK: 18,    // 单向关联
  FORMULA: 20,       // 公式
  DUPLEX_LINK: 21,    // 双向关联
  LOCATION: 22,      // 地理位置
  GROUP_CHAT: 23,     // 群组
  CREATED_TIME: 1001, // 创建时间
  MODIFIED_TIME: 1002, // 最后更新时间
  CREATED_USER: 1003, // 创建人
  MODIFIED_USER: 1004, // 修改人
  AUTO_NUMBER: 1005   // 自动编号
};

function processRecordData(recordData: any, fieldMetaList: any[]): BitableRecord {
  debugLog('processRecordData 被调用');
  
  const { fields } = recordData;
  
  // 创建字段 ID 到字段名称的映射
  const fieldMap: Record<string, string> = {};
  fieldMetaList?.forEach((field: any) => {
    fieldMap[field.id] = field.name;
  });
  
  const formattedData: Record<string, unknown> = {};
  
  // 处理每个字段 - 关键是：保留原始值，不提前转换！
  // 这样 formatFieldValue 才能正确处理流程字段
  for (const [fieldId, rawValue] of Object.entries(fields)) {
    const fieldName = fieldMap[fieldId] || fieldId;
    
    // 调试专用：打印特定字段的详细信息
    if (fieldName === '年度' || fieldName === '接收单位' || fieldName === '发送类型' || fieldName === '当前状态') {
      debugLog(`🔍 [${fieldName}字段调试] 原始数据: ${JSON.stringify(rawValue)}`);
    }
    
    // 直接保存原始值，让 formatFieldValue 来处理
    formattedData[fieldName] = rawValue;
  }
  
  debugLog('processRecordData 处理完成:', formattedData);
  
  return {
    id: recordData.id || recordData.recordId || '',
    fields: formattedData,
    createdTime: recordData.createdTime || new Date().toISOString(),
    lastModifiedTime: recordData.modifiedTime || new Date().toISOString(),
  };
}

/**
 * 通用函数：从飞书 SDK 返回的复杂单元格数据中提取纯文本/值
 * 处理文本、数字、日期、单选、多选、人员、附件等所有类型
 * @param cellData - record.fields[fieldId] 的原始数据
 * @returns 提取后的字符串或原始值
 */
function extractFeishuCellValue(cellData: any): any {
  // 1. 处理空值
  if (cellData === null || cellData === undefined) {
    return '';
  }

  // 2. 如果是数组 (飞书最常见的情况：文本、日期、人员、单选、多选等)
  if (Array.isArray(cellData)) {
    if (cellData.length === 0) return ''; // 空数组
    
    // 多选字段：遍历数组提取每个元素的文本并拼接
    const values = cellData.map(item => {
      if (typeof item === 'object' && item !== null) {
        // 优先级：text > name > value > url > id
        return item.text || item.name || item.value || item.url || String(item.id || '');
      }
      return String(item);
    });
    
    return values.filter(v => v !== '').join(', ');
  }

  // 3. 如果是对象 (数组里的元素，或者直接返回的对象)
  if (typeof cellData === 'object' && cellData !== null) {
    // 优先级：text (文本) > name (选项名) > value (数值/布尔) > enumValue (枚举值) > label (标签) > url (附件) > id
    if (cellData.text !== undefined && cellData.text !== '') return cellData.text;
    if (cellData.name !== undefined && cellData.name !== '') return cellData.name;
    if (cellData.value !== undefined && cellData.value !== '') return String(cellData.value);
    if (cellData.enumValue !== undefined && cellData.enumValue !== '') return cellData.enumValue;
    if (cellData.label !== undefined && cellData.label !== '') return cellData.label;
    if (cellData.url !== undefined) return cellData.url;
    if (cellData.id !== undefined) return String(cellData.id);
    
    // 如果都找不到，返回 JSON 字符串以便调试
    return JSON.stringify(cellData);
  }

  // 4. 基础类型 (字符串、数字、布尔)，直接返回
  return String(cellData);
}

// ============================================
// 其他原有函数
// ============================================

export async function fetchAppMetadata(): Promise<AppMetadata | null> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取元数据');
    return null;
  }

  try {
    const selection = await base.getSelection();
    debugLog('selection:', selection);
    
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return null;
    }
    
    return {
      appId: (selection as any).appId || 'unknown',
      name: '多维表格',
      defaultTableId: selection.tableId,
      description: '从上下文获取',
    };
  } catch (error) {
    debugLog('获取元数据失败:', error);
    return null;
  }
}

export async function fetchFirstRecord(): Promise<Record<string, unknown> | null> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取首条记录');
    return null;
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return null;
    }
    
    const table = await base.getTable(selection.tableId);
    
    const recordIdList = await table.getRecordIdList();
    debugLog('首条记录 - 获取到记录 ID 数量:', recordIdList?.length || 0);
    
    if (!Array.isArray(recordIdList) || recordIdList.length === 0) {
      debugLog('表格为空，没有记录');
      return null;
    }

    try {
      const firstRecordId = recordIdList[0];
      const record = await table.getRecordById(firstRecordId);
      if (record) {
        debugLog('成功获取首条记录:', !!record);
        return record.fields || {};
      }
    } catch (e) {
      debugLog('获取首条记录失败:', e);
    }

    return null;
  } catch (error) {
    debugLog('获取首条记录失败:', error);
    return null;
  }
}

export async function fetchTableName(): Promise<string> {
  if (envStatus !== 'ready') {
    return '未命名表格';
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      return '多维表格';
    }
    
    const table = await base.getTable(selection.tableId);
    return (table as any).name || '多维表格';
  } catch {
    return '多维表格';
  }
}

export async function initFeishuContext(): Promise<FeishuContext | null> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法初始化上下文');
    return null;
  }

  try {
    debugLog('开始初始化飞书上下文...');
    
    const appMetadata = await fetchAppMetadata();
    if (!appMetadata) {
      debugLog('无法获取元数据');
      return null;
    }
    
    const fields = await fetchFields();
    
    const fieldNameToIdMap: Record<string, string> = {};
    fields.forEach(field => {
      fieldNameToIdMap[field.name] = field.id;
    });
    debugLog('字段映射:', fieldNameToIdMap);
    
    const firstRecordData = await fetchFirstRecord();
    debugLog('首条记录数据:', !!firstRecordData);
    
    const context: FeishuContext = {
      appToken: appMetadata.appId,
      targetTableId: appMetadata.defaultTableId,
      fieldNameToIdMap,
      firstRecordData,
      appMetadata,
    };
    
    debugLog('飞书上下文初始化完成:', context);
    return context;
  } catch (error) {
    debugLog('初始化上下文失败:', error);
    return null;
  }
}

export function getDebugInfo(): Record<string, unknown> {
  return {
    envStatus,
    envError,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    inIframe: typeof window !== 'undefined' && window.self !== window.top,
  };
}

// ============================================
// 便捷函数：获取选中记录（带降级方案）
// ============================================

export async function getCheckboxSelectedRecords(): Promise<BitableRecord[]> {
  debugLog('======== getCheckboxSelectedRecords() 开始 ========');
  debugLog('📋 尝试获取选中记录...');

  try {
    // 1. 获取当前激活的表格 ID
    debugLog('📍 调用 base.getSelection() 获取 tableId...');
    const selection = await base.getSelection();
    
    debugLog('📍 base.getSelection() 返回:');
    debugLog('  - baseId:', selection?.baseId);
    debugLog('  - tableId:', selection?.tableId);
    debugLog('  - viewId:', selection?.viewId);
    debugLog('  - recordId:', selection?.recordId);
    debugLog('  - fieldId:', selection?.fieldId);

    if (!selection?.tableId) {
      debugLog('❌ 无法获取 tableId');
      debugLog('======== getCheckboxSelectedRecords() 结束 ========');
      return [];
    }

    const tableId = selection.tableId;
    debugLog(`✅ 获取到 tableId: ${tableId}`);

    // 2. 获取表格实例
    debugLog('📍 获取表格实例...');
    const table = await base.getTable(tableId);
    debugLog('✅ 表格实例已获取');

    // 3. 尝试使用 table.getSelectedRecordIds() 获取选中的行
    debugLog('📍 尝试调用 table.getSelectedRecordIds()...');
    
    let selectedRecordIds: string[] = [];
    
    if (typeof (table as any).getSelectedRecordIds === 'function') {
      try {
        selectedRecordIds = await (table as any).getSelectedRecordIds();
        debugLog(`✅ table.getSelectedRecordIds() 返回 ${selectedRecordIds.length} 个 ID`);
        debugLog('🆔 选中的 Record IDs:', selectedRecordIds);
      } catch (e) {
        debugLog('❌ table.getSelectedRecordIds() 调用失败:', e);
      }
    } else {
      debugLog('⚠️ table.getSelectedRecordIds() 方法不存在');
    }

    // 4. 如果没有选中行，降级到获取第一条记录
    if (selectedRecordIds.length === 0) {
      debugLog('ℹ️ 没有选中行，降级到获取第一条记录...');
      debugLog('💡 提示：飞书 SDK 限制，插件环境下无法获取勾选行');
      
      // 获取第一条记录
      const recordIdList = await table.getRecordIdList();
      if (Array.isArray(recordIdList) && recordIdList.length > 0) {
        const firstRecordId = recordIdList[0];
        debugLog(`📍 获取第一条记录: ${firstRecordId}`);
        selectedRecordIds = [firstRecordId];
      } else {
        debugLog('❌ 表格为空，没有记录');
        debugLog('======== getCheckboxSelectedRecords() 结束 ========');
        return [];
      }
    }

    // 5. 批量获取记录数据
    debugLog('📍 批量获取记录数据...');
    const records = await getRecordsByCheckboxIds(tableId, selectedRecordIds);

    debugLog(`✅ 获取到记录数据: ${records.length} 条`);
    debugLog('======== getCheckboxSelectedRecords() 结束 ========');
    
    return records;
  } catch (error) {
    debugLog('❌ 获取选中记录失败:', error);
    debugLog('======== getCheckboxSelectedRecords() 结束 ========');
    return [];
  }
}

// ============================================
// 轮询选择检测器（SelectionDebugger）
// ============================================

// 轮询相关状态
let selectionPollingTimer: ReturnType<typeof setInterval> | null = null;
let lastRecordIds: string[] = [];
let lastTableId: string | null = null;
let onSelectionPollingCallbacks: Set<(event: { tableId: string; recordIds: string[]; isSelectAll: boolean }) => void> = new Set();

/**
 * 启动选择状态轮询
 * @param interval 轮询间隔（毫秒），默认 1000ms
 */
export function startSelectionPolling(interval: number = 1000): void {
  if (selectionPollingTimer) {
    debugLog('轮询已启动，跳过重复启动');
    return;
  }
  
  debugLog(`🔍 开始轮询选择状态，间隔: ${interval}ms`);
  
  selectionPollingTimer = setInterval(async () => {
    await checkSelectionChange();
  }, interval);
  
  // 立即执行一次检查
  checkSelectionChange();
}

/**
 * 停止选择状态轮询
 */
export function stopSelectionPolling(): void {
  if (selectionPollingTimer) {
    clearInterval(selectionPollingTimer);
    selectionPollingTimer = null;
    debugLog('🛑 停止选择状态轮询');
  }
  
  // 清空状态
  lastRecordIds = [];
  lastTableId = null;
}

/**
 * 注册选择变化回调
 */
export function onSelectionPollingChange(
  callback: (event: { tableId: string; recordIds: string[]; isSelectAll: boolean }) => void
): () => void {
  onSelectionPollingCallbacks.add(callback);
  
  return () => {
    onSelectionPollingCallbacks.delete(callback);
  };
}

/**
 * 检查选择状态变化
 * 
 * 🔥 按照用户提供的方案实现：
 * - 使用 selection.recordIds 获取复选框选中的记录 IDs
 * - 只有选中/取消选中时才输出日志
 */
async function checkSelectionChange(): Promise<void> {
  if (envStatus !== 'ready') {
    return;
  }
  
  try {
    const selection = await base.getSelection();
    // 🔥 关键：使用 selection.recordIds 获取复选框选中的记录
    const currentRecordIds: string[] = (selection as any).recordIds || [];
    const currentTableId = selection?.tableId || null;
    
    // 检查选择状态是否变化
    if (hasSelectionChanged(currentTableId, currentRecordIds)) {
      console.log('✅ 选择状态变化 detected');
      console.log('📋 当前选中记录:', currentRecordIds);
      console.log('📋 选择信息详情:', JSON.stringify({
        tableId: currentTableId,
        recordIds: currentRecordIds,
        viewId: selection?.viewId,
        baseId: selection?.baseId,
      }));
      
      // 更新状态
      lastTableId = currentTableId;
      lastRecordIds = [...currentRecordIds];
      
      // 如果有选中记录，触发回调
      if (currentRecordIds.length > 0) {
        const event = {
          tableId: currentTableId || '',
          recordIds: currentRecordIds,
          isSelectAll: false,
        };
        
        // 通知所有回调
        onSelectionPollingCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 选择变化回调执行失败:', e);
          }
        });
      }
    }
  } catch (error) {
    console.error('[SelectionPolling] 轮询检查失败:', error);
  }
}

/**
 * 判断选择状态是否变化
 */
function hasSelectionChanged(currentTableId: string | null, currentRecordIds: string[]): boolean {
  // 表格变化视为选择变化
  if (currentTableId !== lastTableId) {
    return true;
  }
  
  // 记录数量变化
  if (currentRecordIds.length !== lastRecordIds.length) {
    return true;
  }
  
  // 检查记录 ID 是否有差异
  const hasDifference = 
    currentRecordIds.some(id => !lastRecordIds.includes(id)) ||
    lastRecordIds.some(id => !currentRecordIds.includes(id));
  
  return hasDifference;
}

// ============================================
// 导出统一的 SDK 对象
// ============================================

export const feishuEnv = {
  // 基础状态
  getEnvStatus,
  getEnvError,
  isFeishuEnvironment,
  
  // 回调管理
  onFeishuReady,
  offFeishuReady,
  onNotFeishu,
  offNotFeishu,
  
  // 初始化
  init: initFeishuEnv,
  
  // 数据获取
  fetchFields,
  fetchRecords,
  fetchTableName,
  fetchAppMetadata,
  fetchFirstRecord,
  initFeishuContext,
  getDebugInfo,
  
  // 选中变化（基于 base.getSelection）
  onSelectionChange,
  getSelectedRecords,
  getCheckboxSelectedRecords,
  
  // 轮询选择检测
  startSelectionPolling,
  stopSelectionPolling,
  onSelectionPollingChange,
};

export default feishuEnv;
