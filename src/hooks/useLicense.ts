'use client';

import { useState, useCallback, useEffect } from 'react';
import { formatLicenseCode } from '@/lib/license-utils';

export type LicenseStatus = 'active' | 'expiring' | 'expired' | 'none';

export interface LicenseState {
  hasLicense: boolean;
  isValid: boolean;
  isExpired: boolean;
  requireInput: boolean;
  licenseCode?: string;
  licenseType?: string;
  durationDays?: number;
  validUntil?: string;
  boundAt?: string;
  daysRemaining: number;
  status: LicenseStatus;
  statusColor: string;
  statusMessage: string;
}

export interface UseLicenseReturn {
  // 状态
  licenseState: LicenseState;
  isLoading: boolean;
  isActivating: boolean;
  error: string | null;
  
  // 方法
  checkLicense: (userId: string) => Promise<void>;
  activateLicense: (code: string, userId: string, userName: string) => Promise<boolean>;
  clearError: () => void;
  refresh: (userId: string) => Promise<void>;
}

const initialState: LicenseState = {
  hasLicense: false,
  isValid: false,
  isExpired: true,
  requireInput: true,
  daysRemaining: 0,
  status: 'none',
  statusColor: 'gray',
  statusMessage: '未授权',
};

/**
 * 插件授权码管理 Hook
 */
export function useLicense(): UseLicenseReturn {
  const [licenseState, setLicenseState] = useState<LicenseState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 检查用户授权状态
   */
  const checkLicense = useCallback(async (userId: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/license/status?userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '检查授权状态失败');
      }
      
      setLicenseState({
        hasLicense: result.data.hasLicense,
        isValid: result.data.isValid,
        isExpired: result.data.isExpired,
        requireInput: result.data.requireInput,
        licenseCode: result.data.licenseCode,
        licenseType: result.data.licenseType,
        durationDays: result.data.durationDays,
        validUntil: result.data.validUntil,
        boundAt: result.data.boundAt,
        daysRemaining: result.data.daysRemaining || 0,
        status: result.data.status || 'none',
        statusColor: result.data.statusColor || 'gray',
        statusMessage: result.data.statusMessage || '未授权',
      });
    } catch (err) {
      console.error('[useLicense] 检查授权状态失败:', err);
      setError(err instanceof Error ? err.message : '检查授权状态失败');
      setLicenseState(initialState);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 激活授权码
   * @returns 是否成功
   */
  const activateLicense = useCallback(async (
    code: string, 
    userId: string, 
    userName: string
  ): Promise<boolean> => {
    if (!code.trim() || !userId) {
      setError('请输入授权码');
      return false;
    }
    
    setIsActivating(true);
    setError(null);
    
    try {
      const formattedCode = formatLicenseCode(code);
      
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formattedCode,
          userId,
          userName,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '授权码无效');
      }
      
      // 更新本地状态
      setLicenseState(prev => ({
        ...prev,
        hasLicense: true,
        isValid: true,
        isExpired: false,
        requireInput: false,
        validUntil: result.data.validUntil,
        daysRemaining: result.data.daysRemaining,
        status: result.data.daysRemaining <= 7 ? 'expiring' : 'active',
        statusColor: result.data.daysRemaining <= 7 ? 'orange' : 'green',
        statusMessage: `${result.data.daysRemaining}天后到期`,
      }));
      
      return true;
    } catch (err) {
      console.error('[useLicense] 激活授权码失败:', err);
      setError(err instanceof Error ? err.message : '激活授权码失败');
      return false;
    } finally {
      setIsActivating(false);
    }
  }, []);

  /**
   * 清除错误信息
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 刷新授权状态
   */
  const refresh = useCallback(async (userId: string) => {
    await checkLicense(userId);
  }, [checkLicense]);

  return {
    licenseState,
    isLoading,
    isActivating,
    error,
    checkLicense,
    activateLicense,
    clearError,
    refresh,
  };
}

/**
 * 检查是否需要显示授权提醒（7天内到期）
 */
export function useLicenseReminder(licenseState: LicenseState) {
  const [showReminder, setShowReminder] = useState(false);
  
  useEffect(() => {
    if (licenseState.isValid && licenseState.daysRemaining <= 7 && licenseState.daysRemaining > 0) {
      setShowReminder(true);
    } else {
      setShowReminder(false);
    }
  }, [licenseState]);
  
  return {
    showReminder,
    daysRemaining: licenseState.daysRemaining,
    dismissReminder: () => setShowReminder(false),
  };
}
