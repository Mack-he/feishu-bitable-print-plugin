/**
 * 飞书 SDK 钩子 - 简化版
 * 确保监听时机正确
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { feishuSDK, BitableRecord, SelectionChangeEvent } from '@/lib/feishu-sdk-real';
import { mockBitableData } from '@/data/mockData';
import { BitableRecord as AppBitableRecord } from '@/types/bitable';

interface UseFeishuSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  records: AppBitableRecord[];
  fields: any[];
  selectedRecords: BitableRecord[];
  fetchRecords: () => Promise<void>;
  fetchFields: () => Promise<void>;
  fetchSelectedRecords: () => Promise<void>;
  addRecord: (fields: Record<string, any>) => Promise<void>;
  updateRecord: (recordId: string, fields: Record<string, any>) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  onSelectionChange: (callback: (event: SelectionChangeEvent) => void) => (() => void);
}

export function useFeishuSDK(): UseFeishuSDKResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AppBitableRecord[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<BitableRecord[]>([]);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  // 初始化
  useEffect(() => {
    // 防止重复初始化
    if (isInitializedRef.current) {
      console.log('[useFeishuSDK] 已初始化，跳过');
      return;
    }
    
    isInitializedRef.current = true;
    
    const init = async () => {
      console.log('[useFeishuSDK] ======== 开始初始化 ========');
      setIsLoading(true);
      setError(null);

      try {
        // 检查是否在飞书环境中
        const inFeishu = feishuSDK.isFeishuEnvironment();
        console.log('[useFeishuSDK] 环境检测结果:', inFeishu);
        setIsFeishuEnvironment(inFeishu);

        if (inFeishu) {
          console.log('[useFeishuSDK] 在飞书环境中，初始化 SDK...');
          
          // 初始化飞书 SDK
          const initialized = await feishuSDK.init();
          
          if (initialized) {
            console.log('[useFeishuSDK] SDK 初始化成功');
            
            // 延迟设置监听器（确保 SDK 完全就绪）
            setTimeout(() => {
              console.log('[useFeishuSDK] 延迟设置监听器...');
              setupSelectionListener();
            }, 1500);
            
            // 获取初始数据
            await Promise.all([
              fetchFields(),
              fetchSelectedRecords()
            ]);
          } else {
            console.error('[useFeishuSDK] SDK 初始化失败');
            setError('飞书 SDK 初始化失败');
          }
        } else {
          console.log('[useFeishuSDK] 不在飞书环境中，使用模拟数据');
          useMockData();
        }
      } catch (err) {
        console.error('[useFeishuSDK] 初始化异常:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsLoading(false);
        console.log('[useFeishuSDK] ======== 初始化完成 ========');
      }
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // 清理函数
    return () => {
      console.log('[useFeishuSDK] 组件卸载，清理监听器');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // 设置选中监听器
  const setupSelectionListener = useCallback(() => {
    console.log('[useFeishuSDK] 设置选中变化监听器...');
    
    const unsubscribe = feishuSDK.onSelectionChange(async (event) => {
      console.log('[useFeishuSDK] 🎯 收到选中变化事件!');
      console.log('[useFeishuSDK] 事件数据:', event);
      
      // 获取新的选中记录
      await fetchSelectedRecords();
    });

    unsubscribeRef.current = unsubscribe;
    console.log('[useFeishuSDK] ✅ 监听器设置完成');
  }, []);

  // 使用模拟数据
  const useMockData = useCallback(() => {
    console.log('[useFeishuSDK] 使用模拟数据');
    setRecords(mockBitableData.records);
    setFields(mockBitableData.fields);
    
    if (mockBitableData.records.length > 0) {
      const record = mockBitableData.records[0];
      const { id, ...fields } = record as any;
      delete fields._rowIndex;
      
      setSelectedRecords([{
        id: id,
        fields: fields as Record<string, unknown>,
        createdTime: new Date().toISOString(),
        lastModifiedTime: new Date().toISOString(),
      }]);
    }
  }, []);

  // 获取字段列表
  const fetchFields = useCallback(async () => {
    try {
      const result = await feishuSDK.getFields();
      console.log('[useFeishuSDK] 获取到字段列表:', result);
      setFields(result);
    } catch (err) {
      console.error('[useFeishuSDK] 获取字段失败:', err);
    }
  }, []);

  // 获取记录
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allRecords = await feishuSDK.getAllRecords();
      console.log('[useFeishuSDK] 获取到所有记录:', allRecords);
      
      const appRecords = allRecords.map((record, index) => ({
        id: record.id,
        ...record.fields,
        _rowIndex: index,
      }));
      
      setRecords(appRecords as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取记录失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 获取选中的记录
  const fetchSelectedRecords = useCallback(async () => {
    try {
      console.log('[useFeishuSDK] 主动获取选中记录...');
      const selRecords = await feishuSDK.getSelectedRecords();
      console.log('[useFeishuSDK] 获取到选中记录:', selRecords);
      
      if (selRecords.length > 0) {
        setSelectedRecords(selRecords);
        
        // 同时更新 records
        const appRecords = selRecords.map((record, index) => ({
          id: record.id,
          ...record.fields,
          _rowIndex: index,
        }));
        setRecords(appRecords as any);
      }
    } catch (err) {
      console.error('[useFeishuSDK] 获取选中记录失败:', err);
    }
  }, []);

  // 注册监听（外部调用）
  const onSelectionChange = useCallback((callback: (event: SelectionChangeEvent) => void) => {
    if (!isFeishuEnvironment) {
      console.log('[useFeishuSDK] 不在飞书环境，不注册外部监听');
      return () => {};
    }

    console.log('[useFeishuSDK] 注册外部选中变化监听');
    
    const unsubscribe = feishuSDK.onSelectionChange(async (event) => {
      console.log('[useFeishuSDK] 外部监听器收到事件:', event);
      callback(event);
      await fetchSelectedRecords();
    });

    return unsubscribe;
  }, [isFeishuEnvironment, fetchSelectedRecords]);

  // 占位函数（保持接口兼容）
  const addRecord = useCallback(async () => {}, []);
  const updateRecord = useCallback(async () => {}, []);
  const deleteRecord = useCallback(async () => {}, []);

  return {
    isLoading,
    error,
    isFeishuEnvironment,
    records,
    fields,
    selectedRecords,
    fetchRecords,
    fetchFields,
    fetchSelectedRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    onSelectionChange,
  };
}
