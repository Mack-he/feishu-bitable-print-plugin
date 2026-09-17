/**
 * 飞书排版打印 SDK 钩子
 * 
 * 关键修复：
 * 1. 使用 useRef 防止重复加载
 * 2. useEffect 使用空依赖数组，只运行一次
 * 3. 正确清理回调，防止内存泄漏
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  feishuEnv, 
  FeishuEnvStatus,
  onFeishuReady,
  onNotFeishu,
  offFeishuReady,
  offNotFeishu
} from '@/lib/feishu-env';
import { fetchFields as fetchFieldsFromService } from '@/lib/feishu-service';
import { Field, FeishuContext } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { mockBitableData } from '@/data/mockData';

interface UsePrintSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  envStatus: FeishuEnvStatus;
  tableName: string;
  fields: Field[];
  records: Record<string, unknown>[];
  refreshData: () => Promise<void>;
  debugInfo: Record<string, unknown> | null;
}

export function usePrintSDK(): UsePrintSDKResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envStatus, setEnvStatus] = useState<FeishuEnvStatus>('checking');
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);
  const [tableName, setTableName] = useState('未命名表格');
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

  // 使用 ref 防止重复加载
  const isLoadingData = useRef(false);
  const hasInitialized = useRef(false);
  const cleanupFns = useRef<Array<() => void>>([]);

  const { 
    setFields: setStoreFields, 
    setRecords: setStoreRecords, 
    setFeishuEnvironment,
    setFeishuContext,
    setFeishuContextLoading
  } = useEditorStore();

  // 加载模拟数据（内部函数，不使用 useCallback）
  const loadMockDataInternal = () => {
    if (isLoadingData.current) {
      console.log('[PrintSDK] 已有数据加载中，跳过模拟数据加载');
      return;
    }
    isLoadingData.current = true;
    
    console.log('[PrintSDK] 加载模拟数据...');
    
    setTableName(mockBitableData.name);
    setIsFeishuEnvironment(false);
    setFeishuEnvironment(false);

    const mockFields: Field[] = mockBitableData.fields.map(f => {
      // 判断字段种类（使用类型断言）
      let fieldKind: Field['fieldKind'] = 'other';
      const fieldType = f.type as string;
      
      if (fieldType === 'attachment') {
        fieldKind = 'attachment';
      } else if (fieldType === 'person' || fieldType === 'user') {
        fieldKind = 'person';
      } else if (fieldType === 'text') {
        fieldKind = 'text';
      } else if (fieldType === 'number') {
        fieldKind = 'number';
      } else if (fieldType === 'date') {
        fieldKind = 'date';
      }
      
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        placeholder: `{{${f.name}}}`,
        isSystem: false,
        fieldKind,
      };
    });
    setFields(mockFields);
    setStoreFields(mockFields);

    const mockRecords = mockBitableData.records.map(r => ({
      id: r.id,
      __tableName__: mockBitableData.name,
      ...r.fields,
    }));
    setRecords(mockRecords);
    setStoreRecords(mockRecords);

    setDebugInfo({
      ...feishuEnv.getDebugInfo(),
      dataSource: 'mock',
    });

    setIsLoading(false);
    isLoadingData.current = false;
  };

  // 加载真实数据（内部函数，不使用 useCallback）
  const loadRealDataInternal = async () => {
    if (isLoadingData.current) {
      console.log('[PrintSDK] 已有数据加载中，跳过真实数据加载');
      return;
    }
    isLoadingData.current = true;
    
    console.log('[PrintSDK] 加载真实数据...');
    setIsLoading(true);
    setFeishuContextLoading(true);

    try {
      // 获取表格名称
      const name = await feishuEnv.fetchTableName();
      setTableName(name);
      setIsFeishuEnvironment(true);
      setFeishuEnvironment(true);

      // 初始化飞书上下文（获取元数据、字段映射、首条记录）
      console.log('[PrintSDK] 开始初始化飞书上下文...');
      const context = await feishuEnv.initFeishuContext();
      console.log('[PrintSDK] 飞书上下文初始化结果:', context);
      
      if (context) {
        setFeishuContext(context);
      }

      // 获取字段（场景：创建模板时读取，可使用缓存）
      console.log('[PrintSDK] 开始获取字段...');
      const feishuFields = await fetchFieldsFromService({ scene: 'create_template' });
      console.log('[PrintSDK] fetchFieldsFromService() 返回:', feishuFields);
      console.log('[PrintSDK] 获取到字段数量:', feishuFields.length);

      if (feishuFields.length === 0) {
        console.warn('[PrintSDK] 未获取到字段');
        setError('未获取到字段数据，请检查权限配置');
      }

      // 统一服务层已经返回标准 Field 格式，直接使用
      const convertedFields: Field[] = feishuFields;
      console.log('[PrintSDK] 转换后的字段:', convertedFields);
      console.log('[PrintSDK] 准备设置到 store 和 store...');
      setFields(convertedFields);
      setStoreFields(convertedFields);
      console.log('[PrintSDK] 字段已设置到 store');

      // 获取记录
      const feishuRecords = await feishuEnv.fetchRecords();
      console.log('[PrintSDK] 获取到记录:', feishuRecords.length);

      const convertedRecords = feishuRecords.map(r => ({
        id: r.id,
        __tableName__: name,
        ...r.fields,
      }));
      setRecords(convertedRecords);
      setStoreRecords(convertedRecords);

      setDebugInfo({
        ...feishuEnv.getDebugInfo(),
        dataSource: 'feishu',
        fieldsCount: feishuFields.length,
        recordsCount: feishuRecords.length,
        hasContext: !!context,
      });

      setError(null);
    } catch (err) {
      console.error('[PrintSDK] 加载真实数据失败:', err);
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setIsLoading(false);
      setFeishuContextLoading(false);
      isLoadingData.current = false;
    }
  };

  // 刷新数据（用户手动触发）
  const refreshData = useCallback(async () => {
    if (isLoadingData.current) {
      console.log('[PrintSDK] 已有数据加载中，跳过刷新');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const status = feishuEnv.getEnvStatus();
    setEnvStatus(status);

    if (status === 'ready') {
      await loadRealDataInternal();
    } else {
      loadMockDataInternal();
    }
  }, []);

  // 初始化 - 只运行一次
  useEffect(() => {
    // 防止重复初始化（React StrictMode 双重调用保护）
    if (hasInitialized.current) {
      console.log('[PrintSDK] 已初始化，跳过');
      return;
    }
    hasInitialized.current = true;
    
    console.log('[PrintSDK] 初始化...');

    // 定义回调函数
    const handleReady = () => {
      console.log('[PrintSDK] 飞书环境就绪回调');
      setEnvStatus('ready');
      loadRealDataInternal();
    };

    const handleNotFeishu = () => {
      console.log('[PrintSDK] 非飞书环境回调');
      setEnvStatus('not_feishu');
      loadMockDataInternal();
    };

    // 注册回调并保存清理函数
    const readyCleanup = onFeishuReady(handleReady);
    const notFeishuCleanup = onNotFeishu(handleNotFeishu);
    
    cleanupFns.current = [readyCleanup, notFeishuCleanup];

    // 检查当前状态
    const currentStatus = feishuEnv.getEnvStatus();
    setEnvStatus(currentStatus);

    if (currentStatus === 'ready') {
      loadRealDataInternal();
    } else if (currentStatus === 'not_feishu') {
      loadMockDataInternal();
    } else if (currentStatus === 'error') {
      setError(feishuEnv.getEnvError() || '环境初始化失败');
      loadMockDataInternal();
    } else if (currentStatus === 'checking') {
      // 触发初始化
      feishuEnv.init().catch((err) => {
        console.error('[PrintSDK] 环境初始化失败:', err);
        setEnvStatus('not_feishu');
        loadMockDataInternal();
      });
    }

    // 设置超时，防止一直等待
    const timeout = setTimeout(() => {
      if (feishuEnv.getEnvStatus() === 'checking') {
        console.warn('[PrintSDK] 环境检测超时，使用模拟数据');
        setEnvStatus('not_feishu');
        loadMockDataInternal();
      }
    }, 8000);

    // 清理函数
    return () => {
      console.log('[PrintSDK] 清理...');
      clearTimeout(timeout);
      // 清理所有回调
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
      // 重置初始化标记（允许重新挂载时再次初始化）
      hasInitialized.current = false;
    };
  }, []); // 空依赖数组，只运行一次

  return {
    isLoading,
    error,
    isFeishuEnvironment,
    envStatus,
    tableName,
    fields,
    records,
    refreshData,
    debugInfo,
  };
}
