/**
 * 飞书 SDK 真实实现
 * 用于在飞书环境中获取多维表格数据
 * 
 * API 文档: https://lark-base-team.github.io/js-sdk-docs/zh/
 */

// 动态导入飞书 SDK
let base: any = null;

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text',      // 文本
  2: 'number',    // 数字
  3: 'singleSelect', // 单选
  4: 'multiSelect',  // 多选
  5: 'date',      // 日期
  6: 'checkbox',  // 复选框
  7: 'user',      // 人员
  8: 'url',       // 超链接
  9: 'phone',     // 电话
  10: 'email',    // 邮箱
  11: 'attachment', // 附件
  12: 'formula',  // 公式
  13: 'progress', // 进度
  14: 'currency', // 货币
  15: 'rating',   // 评分
  16: 'location', // 地理位置
  17: 'relation', // 关联
  18: 'group',    // 群组
  19: 'barcode',  // 条码
  20: 'modifiedTime', // 修改时间
  21: 'createdTime',  // 创建时间
  22: 'modifiedUser', // 修改人
  23: 'createdUser',  // 创建人
  24: 'autoNumber',   // 自动编号
};

// 飞书字段接口
export interface FeishuField {
  id: string;
  name: string;
  type: number;
  type_name: string;
  property?: Record<string, unknown>;
}

// 飞书记录接口
export interface FeishuRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: number;
  modifiedTime?: number;
}

// SDK 状态
let isInitialized = false;
let currentTable: any = null;
let currentSelection: any = null;
let sdkLoadError: string | null = null;

/**
 * 异步加载飞书 SDK
 */
async function loadSDK(): Promise<boolean> {
  if (base !== null) return true;
  
  try {
    // 动态导入
    const sdk = await import('@lark-base-open/js-sdk');
    base = sdk.base;
    console.log('[飞书SDK] SDK 加载成功');
    return true;
  } catch (error) {
    sdkLoadError = `SDK 加载失败: ${error}`;
    console.error('[飞书SDK]', sdkLoadError);
    return false;
  }
}

/**
 * 检查是否在飞书环境中
 */
export function isFeishuEnvironment(): boolean {
  // 检查是否在 iframe 中
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  // 检查是否有飞书相关的全局变量
  const hasLarkGlobal = typeof window !== 'undefined' && (
    !!(window as any).lark ||
    !!(window as any).Lark ||
    !!(window as any).__LARK_BASE__
  );
  
  // 检查 URL 是否包含飞书相关参数
  const urlHasFeishu = typeof window !== 'undefined' && (
    window.location.href.includes('feishu') ||
    window.location.href.includes('lark') ||
    window.location.href.includes('bytedance')
  );
  
  const result = inIframe && (hasLarkGlobal || urlHasFeishu);
  
  console.log('[飞书SDK] 环境检测:', { 
    inIframe, 
    hasLarkGlobal, 
    urlHasFeishu, 
    result 
  });
  
  return result;
}

/**
 * 初始化飞书 SDK
 */
export async function initSDK(): Promise<boolean> {
  if (isInitialized && currentTable) {
    console.log('[飞书SDK] 已初始化，跳过');
    return true;
  }
  
  console.log('[飞书SDK] 开始初始化...');
  
  // 先加载 SDK
  const sdkLoaded = await loadSDK();
  if (!sdkLoaded) {
    console.error('[飞书SDK] SDK 未加载');
    return false;
  }
  
  if (!base) {
    console.error('[飞书SDK] base 对象为空');
    return false;
  }
  
  try {
    // 方法1: 使用 getSelection 获取当前选中的表格
    console.log('[飞书SDK] 尝试方法1: getSelection...');
    
    try {
      const selection = await base.getSelection();
      console.log('[飞书SDK] Selection 结果:', JSON.stringify(selection, null, 2));
      currentSelection = selection;
      
      if (selection && selection.tableId) {
        console.log('[飞书SDK] 获取到 tableId:', selection.tableId);
        currentTable = await base.getTable(selection.tableId);
        isInitialized = true;
        console.log('[飞书SDK] 初始化成功 (通过 tableId)');
        return true;
      }
    } catch (e) {
      console.warn('[飞书SDK] getSelection 失败:', e);
    }
    
    // 方法2: 尝试获取当前表格（不传参数）
    console.log('[飞书SDK] 尝试方法2: getTable()...');
    try {
      currentTable = await base.getTable();
      if (currentTable) {
        isInitialized = true;
        console.log('[飞书SDK] 初始化成功 (通过 getTable())');
        return true;
      }
    } catch (e) {
      console.warn('[飞书SDK] getTable() 失败:', e);
    }
    
    // 方法3: 检查是否有其他初始化方式
    console.log('[飞书SDK] 尝试方法3: 检查 base 其他方法...');
    try {
      // 列出 base 对象的所有方法
      const baseMethods = Object.keys(base).filter(k => typeof base[k] === 'function');
      console.log('[飞书SDK] base 可用方法:', baseMethods);
      
      // 尝试其他可能的初始化方式
      if (base.getActiveTable && typeof base.getActiveTable === 'function') {
        currentTable = await base.getActiveTable();
        if (currentTable) {
          isInitialized = true;
          console.log('[飞书SDK] 初始化成功 (通过 base.getActiveTable)');
          return true;
        }
      }
    } catch (e) {
      console.warn('[飞书SDK] 其他初始化方法失败:', e);
    }
    
    console.error('[飞书SDK] 所有初始化方法都失败');
    return false;
  } catch (error) {
    console.error('[飞书SDK] 初始化异常:', error);
    return false;
  }
}

/**
 * 获取字段列表
 */
export async function getFields(): Promise<FeishuField[]> {
  console.log('[飞书SDK] 开始获取字段列表...');
  
  if (!currentTable) {
    console.log('[飞书SDK] currentTable 为空，尝试初始化...');
    const initialized = await initSDK();
    if (!initialized) {
      console.error('[飞书SDK] 初始化失败，无法获取字段');
      return [];
    }
  }
  
  if (!currentTable) {
    console.error('[飞书SDK] currentTable 仍为空');
    return [];
  }
  
  try {
    console.log('[飞书SDK] 调用 getFieldList, table:', currentTable);
    
    // 尝试不同的方法获取字段
    let fields: any[] = [];
    
    // 方法1: getFieldList
    if (typeof currentTable.getFieldList === 'function') {
      console.log('[飞书SDK] 使用 getFieldList');
      fields = await currentTable.getFieldList();
    }
    // 方法2: fields 属性
    else if (currentTable.fields) {
      console.log('[飞书SDK] 使用 fields 属性');
      fields = currentTable.fields;
    }
    // 方法3: getFields 方法
    else if (typeof currentTable.getFields === 'function') {
      console.log('[飞书SDK] 使用 getFields 方法');
      fields = await currentTable.getFields();
    }
    
    console.log('[飞书SDK] 原始字段数据:', fields);
    
    if (!fields || !Array.isArray(fields)) {
      console.error('[飞书SDK] 字段格式不正确:', typeof fields, fields);
      return [];
    }
    
    const result = fields.map((field: any, index: number) => {
      const fieldInfo: FeishuField = {
        id: field.id || `field_${index}`,
        name: field.name || field.fieldName || `字段${index + 1}`,
        type: field.type || 1,
        type_name: FIELD_TYPE_MAP[field.type || 1] || 'text',
        property: field.property,
      };
      console.log('[飞书SDK] 字段:', index, fieldInfo);
      return fieldInfo;
    });
    
    console.log('[飞书SDK] 转换后字段数:', result.length);
    return result;
  } catch (error) {
    console.error('[飞书SDK] 获取字段列表失败:', error);
    return [];
  }
}

/**
 * 获取记录列表
 */
export async function getRecords(): Promise<{
  records: FeishuRecord[];
  hasMore: boolean;
}> {
  console.log('[飞书SDK] 开始获取记录列表...');
  
  if (!currentTable) {
    const initialized = await initSDK();
    if (!initialized) {
      return { records: [], hasMore: false };
    }
  }
  
  if (!currentTable) {
    return { records: [], hasMore: false };
  }
  
  try {
    let records: any[] = [];
    
    // 方法1: 通过视图获取
    if (typeof currentTable.getActiveView === 'function') {
      console.log('[飞书SDK] 通过视图获取记录...');
      const view = await currentTable.getActiveView();
      console.log('[飞书SDK] 视图:', view);
      
      if (view && typeof view.getAllRecords === 'function') {
        records = await view.getAllRecords();
      } else if (view && typeof view.getRecords === 'function') {
        records = await view.getRecords();
      }
    }
    // 方法2: 直接从表格获取
    else if (typeof currentTable.getAllRecords === 'function') {
      console.log('[飞书SDK] 直接从表格获取记录...');
      records = await currentTable.getAllRecords();
    }
    // 方法3: records 属性
    else if (currentTable.records) {
      console.log('[飞书SDK] 使用 records 属性...');
      records = currentTable.records;
    }
    
    console.log('[飞书SDK] 获取到记录数:', records?.length || 0);
    
    if (!records || !Array.isArray(records)) {
      return { records: [], hasMore: false };
    }
    
    return {
      records: records.map((record: any) => ({
        id: record.id || record.recordId,
        fields: record.fields || {},
        createdTime: record.createdTime,
        modifiedTime: record.modifiedTime,
      })),
      hasMore: false,
    };
  } catch (error) {
    console.error('[飞书SDK] 获取记录列表失败:', error);
    return { records: [], hasMore: false };
  }
}

/**
 * 获取所有记录
 */
export async function getAllRecords(): Promise<FeishuRecord[]> {
  const result = await getRecords();
  return result.records;
}

/**
 * 获取表格名称
 */
export async function getTableName(): Promise<string> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return '未命名表格';
  
  try {
    return currentTable.name || currentTable.tableName || '多维表格';
  } catch {
    return '未命名表格';
  }
}

/**
 * 获取调试信息
 */
export async function getDebugInfo(): Promise<Record<string, unknown>> {
  const info: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    isFeishuEnv: isFeishuEnvironment(),
    isInitialized,
    hasTable: !!currentTable,
    sdkLoadError,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };
  
  if (base) {
    try {
      const selection = await base.getSelection();
      info.selection = selection;
    } catch (e: any) {
      info.selectionError = e.message || String(e);
    }
  }
  
  if (currentTable) {
    info.tableId = currentTable.id;
    info.tableName = currentTable.name;
    info.tableMethods = Object.keys(currentTable).filter(k => typeof currentTable[k] === 'function');
  }
  
  return info;
}

// 导出统一的 SDK 对象
export const feishuSDK = {
  isFeishuEnvironment,
  init: initSDK,
  getFields,
  getRecords,
  getAllRecords,
  getTableName,
  getDebugInfo,
};
