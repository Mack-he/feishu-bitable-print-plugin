/**
 * 插件授权码生成工具
 * 
 * 功能：
 * 1. 生成随机授权码
 * 2. 格式化授权码显示
 * 3. 验证授权码格式
 * 4. 计算有效期
 */

export type LicenseType = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface LicenseDuration {
  type: LicenseType;
  days: number;
  label: string;
}

// 有效期配置
export const LICENSE_DURATIONS: LicenseDuration[] = [
  { type: 'day', days: 1, label: '1天' },
  { type: 'week', days: 7, label: '7天' },
  { type: 'month', days: 30, label: '30天' },
  { type: 'quarter', days: 90, label: '90天' },
  { type: 'year', days: 365, label: '365天' },
];

/**
 * 根据类型获取有效天数
 */
export function getDurationDays(type: LicenseType): number {
  const config = LICENSE_DURATIONS.find(d => d.type === type);
  return config?.days || 30;
}

/**
 * 根据类型获取标签
 */
export function getDurationLabel(type: LicenseType): string {
  const config = LICENSE_DURATIONS.find(d => d.type === type);
  return config?.label || '30天';
}

/**
 * 生成随机授权码
 * @param prefix 可选前缀
 * @param groupCount 分组数量（默认4组）
 * @param groupLength 每组长度（默认4位）
 * @returns 格式化后的授权码
 */
export function generateLicenseCode(
  prefix: string = '',
  groupCount: number = 4,
  groupLength: number = 4
): string {
  // 排除易混淆字符：0, O, 1, I, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < groupCount * groupLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 格式化为 XXXX-XXXX-XXXX-XXXX
  const groups: string[] = [];
  for (let i = 0; i < groupCount; i++) {
    groups.push(code.substring(i * groupLength, (i + 1) * groupLength));
  }
  
  const formatted = groups.join('-');
  
  return prefix ? `${prefix}-${formatted}` : formatted;
}

/**
 * 批量生成授权码
 * @param count 生成数量
 * @param type 有效期类型
 * @param prefix 可选前缀
 * @returns 授权码数组
 */
export function generateLicenseCodes(
  count: number,
  type: LicenseType,
  prefix: string = ''
): string[] {
  const codes: string[] = [];
  const usedCodes = new Set<string>();
  
  let attempt = 0;
  const maxAttempts = count * 10; // 防止无限循环
  
  while (codes.length < count && attempt < maxAttempts) {
    attempt++;
    
    // 带序号的前缀
    const actualPrefix = prefix ? `${prefix}${codes.length + 1}` : '';
    const code = generateLicenseCode(actualPrefix);
    
    // 检查是否重复（理论上概率极低）
    if (!usedCodes.has(code)) {
      usedCodes.add(code);
      codes.push(code);
    }
  }
  
  return codes;
}

/**
 * 格式化授权码（添加分隔符）
 * @param code 原始授权码
 * @returns 格式化后的授权码
 */
export function formatLicenseCode(code: string): string {
  // 移除所有非字母数字字符
  const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // 每4位添加分隔符
  const groups: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    groups.push(cleaned.substring(i, i + 4));
  }
  
  return groups.join('-');
}

/**
 * 验证授权码格式
 * @param code 授权码
 * @returns 是否有效
 */
export function validateLicenseFormat(code: string): boolean {
  // 支持格式：XXXX-XXXX-XXXX-XXXX 或 XXXXXXXXXXXXXXXX
  const cleaned = code.replace(/[^A-Z0-9]/gi, '');
  
  // 长度必须为16位
  if (cleaned.length !== 16) {
    return false;
  }
  
  // 只能包含允许的字符
  const validChars = /^[ABCDEFGHJKMNPQRSTUVWXYZ2345679]+$/i;
  return validChars.test(cleaned);
}

/**
 * 标准化授权码（移除空格和连字符，转为大写）
 * @param code 输入的授权码
 * @returns 标准化后的授权码
 */
export function normalizeLicenseCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * 计算授权到期时间
 * @param startDate 开始时间
 * @param durationDays 有效天数
 * @returns 到期时间
 */
export function calculateExpiryDate(
  startDate: Date = new Date(),
  durationDays: number
): Date {
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + durationDays);
  // 设置为当天的23:59:59
  expiry.setHours(23, 59, 59, 999);
  return expiry;
}

/**
 * 计算剩余天数
 * @param validUntil 到期时间
 * @returns 剩余天数（负数表示已过期）
 */
export function calculateDaysRemaining(validUntil: Date | string): number {
  const expiry = new Date(validUntil);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * 获取授权状态样式
 * @param daysRemaining 剩余天数
 * @returns 状态信息
 */
export function getLicenseStatusInfo(daysRemaining: number): {
  status: 'active' | 'expiring' | 'expired';
  color: string;
  message: string;
} {
  if (daysRemaining < 0) {
    return {
      status: 'expired',
      color: 'red',
      message: '已过期',
    };
  }
  
  if (daysRemaining <= 7) {
    return {
      status: 'expiring',
      color: 'orange',
      message: `${daysRemaining}天后到期`,
    };
  }
  
  return {
    status: 'active',
    color: 'green',
    message: `${daysRemaining}天后到期`,
  };
}
