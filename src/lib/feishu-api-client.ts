/**
 * 飞书开放平台 API 客户端
 * 用于后端调用飞书多维表格 API
 */

// 飞书 API 基础配置
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text',           // 文本
  2: 'number',         // 数字
  3: 'singleSelect',   // 单选
  4: 'multiSelect',    // 多选
  5: 'date',           // 日期
  6: 'checkbox',       // 复选框
  7: 'user',           // 人员
  8: 'url',            // 超链接
  9: 'phone',          // 电话
  10: 'email',         // 邮箱
  11: 'user',          // 人员（另一种类型）
  12: 'formula',       // 公式
  13: 'progress',      // 进度
  14: 'currency',      // 货币
  15: 'rating',        // 评分
  16: 'location',      // 地理位置
  17: 'attachment',    // 附件
  18: 'group',         // 群组
  19: 'barcode',       // 条码
  20: 'modifiedTime',  // 修改时间
  21: 'createdTime',   // 创建时间
  22: 'modifiedUser',  // 修改人
  23: 'createdUser',   // 创建人
  24: 'autoNumber',    // 自动编号
};

// 接口定义
export interface FeishuField {
  id: string;
  name: string;
  type: number;
  type_name: string;
  property?: Record<string, unknown>;
  fieldKind?: 'attachment' | 'person' | 'text' | 'number' | 'date' | 'other';
}

export interface FeishuRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: number;
  modifiedTime?: number;
}

export interface FeishuInitResult {
  success: boolean;
  appToken: string;
  tableId: string;
  tableName?: string;
}

export interface FeishuEvent {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * 飞书 API 客户端类
 */
export class FeishuAPIClient {
  private appId: string;
  private appSecret: string;
  private tenantAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(appId?: string, appSecret?: string) {
    this.appId = appId || process.env.FEISHU_APP_ID || '';
    this.appSecret = appSecret || process.env.FEISHU_APP_SECRET || '';
    
    if (!this.appId || !this.appSecret) {
      throw new Error('飞书应用凭证未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    }
  }

  /**
   * 获取 tenant_access_token
   */
  private async getTenantAccessToken(): Promise<string> {
    // 检查缓存是否有效（提前5分钟刷新）
    if (this.tenantAccessToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.tenantAccessToken;
    }

    const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    // 先获取响应文本，避免 JSON 解析失败
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`获取 tenant_access_token 失败: 飞书返回非 JSON 响应 - ${responseText.slice(0, 200)}`);
    }

    if (data.code !== 0 || !data.tenant_access_token) {
      throw new Error(`获取 tenant_access_token 失败: ${data.msg || '未知错误'} (code: ${data.code})`);
    }

    this.tenantAccessToken = data.tenant_access_token as string;
    this.tokenExpiresAt = Date.now() + data.expire * 1000;

    return this.tenantAccessToken;
  }

  /**
   * 发送 API 请求
   */
  private async request(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: any
  ): Promise<any> {
    const token = await this.getTenantAccessToken();
    
    const url = new URL(`${FEISHU_API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 先获取响应文本，避免 JSON 解析失败
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // JSON 解析失败，可能是飞书返回了 HTML 错误页面
      throw new Error(`飞书 API 返回非 JSON 响应 [${path}]: ${responseText.slice(0, 200)}`);
    }

    if (data.code !== 0) {
      throw new Error(`飞书 API 调用失败 [${path}]: ${data.msg} (code: ${data.code})`);
    }

    return data.data;
  }

  /**
   * 初始化环境（获取表格元信息）
   */
  async init(appToken: string, tableId: string): Promise<FeishuInitResult> {
    try {
      // 获取多维表格元信息
      const meta = await this.request(
        'GET',
        `/bitable/v1/apps/${appToken}/tables/${tableId}`
      );

      return {
        success: true,
        appToken,
        tableId,
        tableName: meta.table?.name,
      };
    } catch (error) {
      throw new Error(`初始化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取字段列表
   */
  async getFields(appToken: string, tableId: string): Promise<FeishuField[]> {
    const data = await this.request(
      'GET',
      `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`
    );

    return (data.items || []).map((field: any) => ({
      id: field.field_id,
      name: field.field_name,
      type: field.type,
      type_name: FIELD_TYPE_MAP[field.type] || 'unknown',
      property: field.property,
      fieldKind: this.getFieldKind(field.type),
    }));
  }

  /**
   * 获取单条记录
   */
  async getRecord(
    appToken: string,
    tableId: string,
    recordId: string
  ): Promise<FeishuRecord | null> {
    try {
      const data = await this.request(
        'GET',
        `/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`
      );

      if (!data.record) return null;

      return {
        id: data.record.record_id,
        fields: data.record.fields,
        createdTime: data.record.created_time,
        modifiedTime: data.record.modified_time,
      };
    } catch (error) {
      console.error('获取记录失败:', error);
      return null;
    }
  }

  /**
   * 批量获取记录
   */
  async getRecords(
    appToken: string,
    tableId: string,
    recordIds?: string[]
  ): Promise<FeishuRecord[]> {
    if (recordIds && recordIds.length > 0) {
      // 批量获取指定记录
      const records: FeishuRecord[] = [];
      
      // 飞书API限制每次最多50条
      const batchSize = 50;
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = recordIds.slice(i, i + batchSize);
        
        const data = await this.request(
          'POST',
          `/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_get`,
          undefined,
          { record_ids: batch }
        );

        if (data.records) {
          records.push(...data.records.map((r: any) => ({
            id: r.record_id,
            fields: r.fields,
            createdTime: r.created_time,
            modifiedTime: r.modified_time,
          })));
        }
      }

      return records;
    } else {
      // 获取所有记录
      const records: FeishuRecord[] = [];
      let pageToken: string | undefined;

      do {
        const params: Record<string, string> = {};
        if (pageToken) params.page_token = pageToken;

        const data = await this.request(
          'GET',
          `/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
          params
        );

        if (data.items) {
          records.push(...data.items.map((r: any) => ({
            id: r.record_id,
            fields: r.fields,
            createdTime: r.created_time,
            modifiedTime: r.modified_time,
          })));
        }

        pageToken = data.page_token;
      } while (pageToken);

      return records;
    }
  }

  /**
   * 搜索记录
   */
  async searchRecords(
    appToken: string,
    tableId: string,
    viewId?: string,
    filter?: string,
    sort?: Array<{ field_id: string; desc: boolean }>
  ): Promise<FeishuRecord[]> {
    const records: FeishuRecord[] = [];
    let pageToken: string | undefined;

    do {
      const body: any = {};
      if (viewId) body.view_id = viewId;
      if (filter) body.filter = JSON.parse(filter);
      if (sort) body.sort = sort;
      if (pageToken) body.page_token = pageToken;

      const data = await this.request(
        'POST',
        `/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
        undefined,
        body
      );

      if (data.items) {
        records.push(...data.items.map((r: any) => ({
          id: r.record_id,
          fields: r.fields,
          createdTime: r.created_time,
          modifiedTime: r.modified_time,
        })));
      }

      pageToken = data.page_token;
    } while (pageToken);

    return records;
  }

  /**
   * 获取字段类型分类
   */
  private getFieldKind(type: number): 'attachment' | 'person' | 'text' | 'number' | 'date' | 'other' {
    switch (type) {
      case 17: // 附件
        return 'attachment';
      case 7: // 人员
      case 11:
        return 'person';
      case 1: // 文本
        return 'text';
      case 2: // 数字
      case 14: // 货币
        return 'number';
      case 5: // 日期
      case 20: // 修改时间
      case 21: // 创建时间
        return 'date';
      default:
        return 'other';
    }
  }
}

// 单例客户端
let clientInstance: FeishuAPIClient | null = null;

export function getFeishuAPIClient(): FeishuAPIClient {
  if (!clientInstance) {
    clientInstance = new FeishuAPIClient();
  }
  return clientInstance;
}
