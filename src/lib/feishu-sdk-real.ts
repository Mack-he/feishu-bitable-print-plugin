/**
 * 飞书多维表格 SDK - 完整调试版
 * 使用 @lark-base-open/js-sdk
 * 
 * 文档: https://lark-base-team.github.io/js-sdk-docs/zh/
 */

// 动态导入类型
type BitableSDK = any;

export interface BitableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  lastModifiedTime: string;
}

export interface FeishuBitableField {
  field_id: string;
  field_name: string;
  type: number;
  type_name: string;
  property?: any;
}

export interface SelectionInfo {
  baseId: string | null;
  fieldId: string | null;
  recordId: string | null;
  tableId: string | null;
  viewId: string | null;
}

export interface SelectionChangeEvent {
  data: SelectionInfo;
}

// SDK 实例缓存
let bitableInstance: BitableSDK = null;
let isInitializing = false;
let initPromise: Promise<boolean> | null = null;

// 开发模式强制使用真实 SDK（便于调试）
const FORCE_REAL_SDK = false;

// 调试标志
const DEBUG = true;

// 调试日志函数
function debugLog(message: string, data: any = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log('数据详情:', JSON.stringify(data, null, 2));
  }
}

/**
 * 安全获取 bitable 实例
 */
async function getBitable(): Promise<BitableSDK> {
  debugLog('getBitable() 被调用');
  
  if (bitableInstance) {
    debugLog('使用缓存的 bitable 实例');
    return bitableInstance;
  }
  
  if (isInitializing && initPromise) {
    debugLog('等待初始化完成...');
    await initPromise;
    return bitableInstance;
  }
  
  isInitializing = true;
  initPromise = (async () => {
    try {
      debugLog('开始动态导入 @lark-base-open/js-sdk...');
      const sdk = await import('@lark-base-open/js-sdk');
      debugLog('SDK 导入成功');
      
      bitableInstance = sdk.bitable || sdk.base;
      debugLog('bitable 实例获取:', !!bitableInstance);
      
      if (bitableInstance) {
        debugLog('bitable 对象方法:', Object.keys(bitableInstance).filter(k => typeof bitableInstance[k] === 'function'));
        if (bitableInstance.base) {
          debugLog('bitable.base 对象方法:', Object.keys(bitableInstance.base).filter(k => typeof bitableInstance.base[k] === 'function'));
        }
      }
      
      return bitableInstance !== null;
    } catch (error) {
      debugLog('加载 SDK 失败:', error);
      console.error('[FeishuSDK] 加载 SDK 失败:', error);
      return false;
    } finally {
      isInitializing = false;
    }
  })();
  
  await initPromise;
  return bitableInstance;
}

/**
 * 飞书 Bitable SDK 实例
 */
export const feishuSDK = {
  /**
   * 检查是否在飞书环境中
   */
  isFeishuEnvironment(): boolean {
    if (typeof window === 'undefined') {
      debugLog('非浏览器环境');
      return false;
    }
    
    // 检查 URL 参数：?feishu_debug=true 强制使用真实 SDK
    const urlParams = new URLSearchParams(window.location.search);
    const urlForceDebug = urlParams.get('feishu_debug') === 'true';
    
    if (urlForceDebug || FORCE_REAL_SDK) {
      debugLog('调试模式开启，强制使用真实 SDK');
      return true;
    }
    
    // 检查是否在 iframe 中
    const inIframe = window.self !== window.top;
    
    // 检查飞书相关全局变量
    const hasLarkGlobal = !!(window as any).lark || 
                          !!(window as any).Lark ||
                          !!(window as any).__LARK_BASE__;
    
    // 检查 URL 是否包含飞书域名
    const urlHasFeishu = window.location.href.includes('feishu') ||
                         window.location.href.includes('lark') ||
                         window.location.href.includes('bytedance');
    
    // 检查是否有 bitable 全局变量（关键判断）
    const hasBitableGlobal = !!(window as any).bitable;
    
    // 检查 SDK 就绪标志
    const sdkReady = !!(window as any).__LARK_BITABLE_SDK_READY__;
    
    const result = hasBitableGlobal || sdkReady || (inIframe && (hasLarkGlobal || urlHasFeishu));
    
    debugLog('环境检测完成', { 
      urlForceDebug,
      FORCE_REAL_SDK,
      inIframe, 
      hasLarkGlobal, 
      hasBitableGlobal,
      sdkReady,
      urlHasFeishu, 
      result 
    });
    
    return result;
  },

  /**
   * 完整的 SDK 初始化（包含调试）
   */
  async init(): Promise<boolean> {
    debugLog('======== 开始完整初始化 ========');
    
    try {
      // 步骤1: 环境检查
      debugLog('步骤1: 环境检查');
      debugLog('页面URL:', window.location.href);
      debugLog('用户代理:', navigator.userAgent);
      debugLog('是否在iframe中:', window.self !== window.top);
      
      // 检查全局变量
      debugLog('window.bitable:', !!(window as any).bitable);
      debugLog('window.__LARK_BITABLE_SDK_READY__:', !!(window as any).__LARK_BITABLE_SDK_READY__);
      
      // 步骤2: 获取 bitable 实例
      debugLog('步骤2: 获取 bitable 实例');
      const bitable = await getBitable();
      
      if (!bitable) {
        debugLog('❌ bitable 为空，初始化失败');
        return false;
      }
      
      debugLog('✅ bitable 实例获取成功');
      
      // 步骤3: 基础连接测试
      debugLog('步骤3: 基础连接测试');
      await this.testBasicConnection();
      
      // 步骤4: 初始化后立即获取一次选中信息
      debugLog('步骤4: 获取初始选中信息');
      const initialSelection = await this.getSelection();
      debugLog('初始选中信息:', initialSelection);
      
      if (initialSelection?.tableId && initialSelection?.recordId) {
        debugLog('初始化时发现已选中记录，获取记录数据...');
        const initialRecords = await this.getSelectedRecords();
        debugLog('初始化时获取到的记录:', initialRecords);
      }
      
      debugLog('======== 初始化完成 ========');
      return true;
    } catch (error) {
      debugLog('❌ 初始化失败:', error);
      console.error('[FeishuSDK] 初始化失败:', error);
      return false;
    }
  },

  /**
   * 基础连接测试
   */
  async testBasicConnection(): Promise<boolean> {
    debugLog('=== 开始基础连接测试 ===');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        debugLog('❌ bitable 为空');
        return false;
      }
      
      // 测试1: 检查 bitable.base
      debugLog('测试1: 检查 bitable.base');
      debugLog('bitable.base 类型:', typeof bitable.base);
      if (bitable.base) {
        debugLog('bitable.base 方法:', Object.keys(bitable.base).filter(k => typeof bitable.base[k] === 'function'));
      }
      
      // 测试2: 尝试 getSelection
      debugLog('测试2: 尝试 getSelection()');
      let selection: any = null;
      
      if (bitable.base && typeof bitable.base.getSelection === 'function') {
        selection = await bitable.base.getSelection();
        debugLog('getSelection() 成功:', selection);
      } else if (typeof bitable.getSelection === 'function') {
        selection = await bitable.getSelection();
        debugLog('getSelection() 成功:', selection);
      } else {
        debugLog('❌ getSelection() 方法不存在');
      }
      
      // 测试3: 检查 onSelectionChange
      debugLog('测试3: 检查 onSelectionChange');
      let hasOnSelectionChange = false;
      
      if (bitable.base && typeof bitable.base.onSelectionChange === 'function') {
        hasOnSelectionChange = true;
        debugLog('✅ bitable.base.onSelectionChange 存在');
      } else if (typeof bitable.onSelectionChange === 'function') {
        hasOnSelectionChange = true;
        debugLog('✅ bitable.onSelectionChange 存在');
      } else {
        debugLog('❌ onSelectionChange 不存在');
      }
      
      debugLog('=== 基础连接测试完成 ===');
      return hasOnSelectionChange;
    } catch (error) {
      debugLog('❌ 基础连接测试失败:', error);
      return false;
    }
  },

  /**
   * 获取当前选中信息
   */
  async getSelection(): Promise<SelectionInfo | null> {
    debugLog('getSelection() 被调用');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        debugLog('❌ bitable 为空');
        return null;
      }
      
      let selection: SelectionInfo | null = null;
      
      if (bitable.base && typeof bitable.base.getSelection === 'function') {
        debugLog('使用 bitable.base.getSelection()');
        selection = await bitable.base.getSelection();
      } else if (typeof bitable.getSelection === 'function') {
        debugLog('使用 bitable.getSelection()');
        selection = await bitable.getSelection();
      } else {
        debugLog('⚠️  没有找到 getSelection() 方法');
      }
      
      debugLog('getSelection() 返回:', selection);
      return selection;
    } catch (error) {
      debugLog('❌ getSelection() 失败:', error);
      return null;
    }
  },

  /**
   * 获取字段列表
   */
  async getFields(): Promise<FeishuBitableField[]> {
    debugLog('getFields() 被调用');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return [];
      }
      
      let table: any = null;
      
      try {
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          table = await bitable.getActiveTable();
        }
      } catch (err) {
        debugLog('获取表格失败:', err);
      }
      
      if (!table) {
        debugLog('无法获取表格实例');
        return [];
      }
      
      let fields: any[] = [];
      
      try {
        if (typeof table.getFieldList === 'function') {
          fields = await table.getFieldList();
        } else if (typeof table.getFieldMetaList === 'function') {
          fields = await table.getFieldMetaList();
        }
      } catch (err) {
        debugLog('获取字段列表失败:', err);
      }
      
      debugLog('获取到字段:', fields);
      
      if (!Array.isArray(fields)) {
        return [];
      }
      
      return fields.map((field: any, index: number) => ({
        field_id: field.id || field.field_id || `field_${index}`,
        field_name: field.name || field.field_name || `字段${index + 1}`,
        type: field.type || 1,
        type_name: field.typeName || field.type_name || 'text',
        property: field.property,
      }));
    } catch (error) {
      debugLog('获取字段列表失败:', error);
      return [];
    }
  },

  /**
   * 获取所有记录
   */
  async getAllRecords(): Promise<BitableRecord[]> {
    debugLog('getAllRecords() 被调用');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return [];
      }
      
      let table: any = null;
      
      try {
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          table = await bitable.getActiveTable();
        }
      } catch (err) {
        debugLog('获取表格失败:', err);
      }
      
      if (!table) {
        debugLog('无法获取表格实例');
        return [];
      }
      
      let records: any[] = [];
      
      try {
        if (typeof table.getActiveView === 'function') {
          const view = await table.getActiveView();
          if (view) {
            if (typeof view.getRecords === 'function') {
              records = await view.getRecords();
            } else if (typeof view.getAllRecords === 'function') {
              records = await view.getAllRecords();
            }
          }
        }
        
        if (records.length === 0) {
          if (typeof table.getRecords === 'function') {
            records = await table.getRecords();
          } else if (typeof table.getAllRecords === 'function') {
            records = await table.getAllRecords();
          }
        }
      } catch (err) {
        debugLog('获取记录失败:', err);
      }
      
      debugLog('获取到记录数:', records?.length || 0);
      
      if (!Array.isArray(records)) {
        return [];
      }
      
      return records.map((record: any) => ({
        id: record.id || record.recordId || record.record_id || '',
        fields: record.fields || {},
        createdTime: record.createdTime || record.created_time || new Date().toISOString(),
        lastModifiedTime: record.modifiedTime || record.last_modified_time || new Date().toISOString(),
      }));
    } catch (error) {
      debugLog('获取记录列表失败:', error);
      return [];
    }
  },

  /**
   * 获取选中记录（方案A实现）
   */
  async getSelectedRecords(): Promise<BitableRecord[]> {
    debugLog('======== getSelectedRecords() 开始 ========');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        debugLog('❌ bitable 为空');
        return [];
      }
      
      debugLog('第一步：获取选中信息...');
      const selection = await this.getSelection();
      debugLog('选中信息:', selection);
      
      if (!selection?.tableId || !selection?.recordId) {
        debugLog('⚠️  没有 tableId 或 recordId，返回空数组');
        return [];
      }
      
      const { tableId, recordId } = selection;
      debugLog('✅ 获取到 tableId 和 recordId:', { tableId, recordId });
      
      debugLog('第二步：通过 tableId 获取表格...');
      let table: any = null;
      
      if (bitable.base && typeof bitable.base.getTableById === 'function') {
        debugLog('使用 bitable.base.getTableById()');
        table = await bitable.base.getTableById(tableId);
      } else if (typeof bitable.getTableById === 'function') {
        debugLog('使用 bitable.getTableById()');
        table = await bitable.getTableById(tableId);
      } else {
        debugLog('⚠️  没有 getTableById 方法，回退到 getActiveTable()');
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          table = await bitable.getActiveTable();
        }
      }
      
      if (!table) {
        debugLog('❌ 无法获取表格实例');
        return [];
      }
      
      debugLog('第三步：通过 recordId 获取记录...');
      let recordData: any = null;
      
      if (typeof table.getRecordById === 'function') {
        debugLog('使用 table.getRecordById()');
        recordData = await table.getRecordById(recordId);
      } else {
        debugLog('⚠️  没有 getRecordById 方法，回退到 getRecord()');
        if (typeof table.getRecord === 'function') {
          recordData = await table.getRecord(recordId);
        }
      }
      
      if (!recordData) {
        debugLog('❌ 无法获取记录数据');
        return [];
      }
      
      debugLog('第四步：获取字段元信息...');
      let fieldMetaList: any[] = [];
      
      if (typeof table.getFieldMetaList === 'function') {
        debugLog('使用 table.getFieldMetaList()');
        fieldMetaList = await table.getFieldMetaList();
      } else if (typeof table.getFieldList === 'function') {
        debugLog('回退到 getFieldList()');
        fieldMetaList = await table.getFieldList();
      }
      
      debugLog('第五步：处理数据...');
      const result = processRecordData(recordData, fieldMetaList);
      debugLog('✅ 数据处理完成:', result);
      debugLog('======== getSelectedRecords() 结束 ========');
      
      return [result];
    } catch (error) {
      debugLog('❌ getSelectedRecords() 失败:', error);
      console.error('[FeishuSDK] getSelectedRecords() 失败:', error);
      debugLog('======== getSelectedRecords() 结束 ========');
      return [];
    }
  },

  /**
   * 监听选中变化事件（简化版）
   */
  onSelectionChange(callback: (event: SelectionChangeEvent) => void): () => void {
    debugLog('======== onSelectionChange() 开始 ========');
    
    let isUnsubscribed = false;
    let unsubscribeFn: (() => void) | null = null;
    
    const setupListener = async () => {
      try {
        debugLog('开始设置监听器...');
        
        const bitable = await getBitable();
        
        if (!bitable) {
          debugLog('⚠️  bitable 未初始化，无法监听选中变化');
          return;
        }
        
        // 尝试注册选中监听 - 回调方式
        if (bitable.base && typeof bitable.base.onSelectionChange === 'function') {
          debugLog('✅ 注册 bitable.base.onSelectionChange (回调方式)');
          unsubscribeFn = bitable.base.onSelectionChange((event: SelectionChangeEvent) => {
            if (isUnsubscribed) {
              debugLog('已取消订阅，忽略事件');
              return;
            }
            debugLog('🎯 选中变化事件触发! (回调方式)');
            debugLog('事件数据:', event);
            callback(event);
          });
          debugLog('✅ 回调方式监听注册成功');
        } else if (typeof bitable.onSelectionChange === 'function') {
          debugLog('✅ 注册 bitable.onSelectionChange (回调方式)');
          unsubscribeFn = bitable.onSelectionChange((event: SelectionChangeEvent) => {
            if (isUnsubscribed) {
              debugLog('已取消订阅，忽略事件');
              return;
            }
            debugLog('🎯 选中变化事件触发! (回调方式)');
            debugLog('事件数据:', event);
            callback(event);
          });
          debugLog('✅ 回调方式监听注册成功');
        } else {
          debugLog('⚠️  不支持 onSelectionChange');
          if (bitable.base) {
            debugLog('bitable.base 可用方法:', Object.keys(bitable.base).filter(k => typeof bitable.base[k] === 'function'));
          }
          debugLog('bitable 可用方法:', Object.keys(bitable).filter(k => typeof bitable[k] === 'function'));
        }
        
        // Promise 方式（备用）
        if (bitable.base && typeof bitable.base.onSelectionChange === 'function') {
          try {
            bitable.base.onSelectionChange().then((event: SelectionChangeEvent) => {
              if (isUnsubscribed) return;
              debugLog('📝 Promise 方式接收到事件:', event);
              callback(event);
            }).catch((error: any) => {
              debugLog('Promise 方式错误:', error);
            });
          } catch (e) {
            debugLog('Promise 方式设置失败，忽略');
          }
        }
        
      } catch (error) {
        debugLog('❌ 设置选中监听失败:', error);
        console.error('[FeishuSDK] 设置选中监听失败:', error);
      }
    };
    
    setupListener();
    
    debugLog('======== onSelectionChange() 设置完成 ========');
    
    // 返回取消监听的函数
    return () => {
      isUnsubscribed = true;
      debugLog('执行取消监听...');
      if (unsubscribeFn && typeof unsubscribeFn === 'function') {
        try {
          unsubscribeFn();
          debugLog('✅ 取消监听成功');
        } catch (e) {
          debugLog('⚠️  取消监听失败:', e);
        }
      }
    };
  },
};

/**
 * 处理并显示数据（方案A实现）
 */
function processRecordData(recordData: any, fieldMetaList: any[]): BitableRecord {
  debugLog('processRecordData 被调用', { recordData, fieldMetaList });
  
  const { fields } = recordData;
  
  // 创建字段名称映射
  const fieldMap: Record<string, string> = {};
  fieldMetaList.forEach(field => {
    fieldMap[field.id] = field.name;
  });
  
  // 转换数据格式
  const formattedData: Record<string, unknown> = {};
  
  Object.keys(fields).forEach(fieldId => {
    const fieldName = fieldMap[fieldId] || fieldId;
    const fieldValue = fields[fieldId];
    
    // 根据字段类型处理值
    formattedData[fieldName] = formatFieldValue(fieldValue);
  });
  
  debugLog('processRecordData 处理完成:', formattedData);
  
  return {
    id: recordData.id || recordData.recordId || '',
    fields: formattedData,
    createdTime: recordData.createdTime || new Date().toISOString(),
    lastModifiedTime: recordData.modifiedTime || new Date().toISOString(),
  };
}

/**
 * 字段值格式化处理（方案A实现）
 */
function formatFieldValue(fieldValue: any): string {
  if (!fieldValue) return '';
  
  // 如果不是数组，直接转字符串
  if (!Array.isArray(fieldValue)) {
    return String(fieldValue);
  }
  
  // 多行文本、数字等简单类型
  if (fieldValue[0] && fieldValue[0].text) {
    return fieldValue[0].text;
  }
  
  // 人员字段
  if (fieldValue[0] && fieldValue[0].id) {
    return fieldValue.map(item => item.id || item.name || '').filter(Boolean).join(', ');
  }
  
  // 人员字段（name格式）
  if (fieldValue[0] && fieldValue[0].name) {
    return fieldValue.map(item => item.name || item.id || '').filter(Boolean).join(', ');
  }
  
  // 其他复杂类型
  return JSON.stringify(fieldValue);
}

export default feishuSDK;
