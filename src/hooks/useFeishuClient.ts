/**
 * 飞书数据 Hook
 * 用于在 React 组件中使用飞书客户端
 */

import { useEffect, useState, useCallback } from 'react';
import { FeishuClient, createFeishuClient, FeishuClientConfig } from '@/lib/feishu-client';
import type { FeishuField, FeishuRecord, FeishuEvent } from '@/lib/feishu-api-client';

export interface UseFeishuDataOptions extends FeishuClientConfig {
  autoInit?: boolean; // 是否自动初始化
  autoLoadFields?: boolean; // 是否自动加载字段
  autoLoadRecords?: boolean; // 是否自动加载记录
}

export interface UseFeishuDataResult {
  client: FeishuClient | null;
  fields: FeishuField[];
  records: FeishuRecord[];
  loading: boolean;
  error: Error | null;
  init: () => Promise<void>;
  loadFields: () => Promise<void>;
  loadRecords: (recordIds?: string[]) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * 飞书数据 Hook
 */
export function useFeishuData(options: UseFeishuDataOptions): UseFeishuDataResult {
  const {
    appToken,
    tableId,
    baseUrl,
    autoInit = true,
    autoLoadFields = true,
    autoLoadRecords = true,
  } = options;

  const [client, setClient] = useState<FeishuClient | null>(null);
  const [fields, setFields] = useState<FeishuField[]>([]);
  const [records, setRecords] = useState<FeishuRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初始化客户端
  const init = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const feishuClient = createFeishuClient({ appToken, tableId, baseUrl });
      await feishuClient.init();

      setClient(feishuClient);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [appToken, tableId, baseUrl]);

  // 加载字段
  const loadFields = useCallback(async () => {
    if (!client) return;

    try {
      setLoading(true);
      setError(null);

      const fieldsData = await client.getFields();
      setFields(fieldsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client]);

  // 加载记录
  const loadRecords = useCallback(async (recordIds?: string[]) => {
    if (!client) return;

    try {
      setLoading(true);
      setError(null);

      const recordsData = await client.getRecords(recordIds, true);
      setRecords(recordsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client]);

  // 重新加载所有数据
  const reload = useCallback(async () => {
    await Promise.all([loadFields(), loadRecords()]);
  }, [loadFields, loadRecords]);

  // 自动初始化
  useEffect(() => {
    if (autoInit) {
      init();
    }
  }, [autoInit, init]);

  // 自动加载字段和记录
  useEffect(() => {
    if (client && autoLoadFields) {
      loadFields();
    }
  }, [client, autoLoadFields, loadFields]);

  useEffect(() => {
    if (client && autoLoadRecords) {
      loadRecords();
    }
  }, [client, autoLoadRecords, loadRecords]);

  // 监听选中变化
  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.onSelectionChange((event: FeishuEvent) => {
      console.log('[useFeishuData] 选中变化:', event);
      // 重新加载记录
      loadRecords();
    });

    return unsubscribe;
  }, [client, loadRecords]);

  return {
    client,
    fields,
    records,
    loading,
    error,
    init,
    loadFields,
    loadRecords,
    reload,
  };
}

/**
 * 飞书选中记录 Hook
 */
export function useFeishuSelection(client: FeishuClient | null) {
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<FeishuRecord[]>([]);

  // 监听选中变化
  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.onSelectionChange((event: FeishuEvent) => {
      if (event.data.recordId) {
        setSelectedRecordIds([event.data.recordId]);
      } else if (Array.isArray(event.data.recordIds)) {
        setSelectedRecordIds(event.data.recordIds);
      }
    });

    return unsubscribe;
  }, [client]);

  // 加载选中的记录
  useEffect(() => {
    if (!client || selectedRecordIds.length === 0) return;

    client.getRecords(selectedRecordIds, true).then(setSelectedRecords);
  }, [client, selectedRecordIds]);

  return {
    selectedRecordIds,
    selectedRecords,
    setSelectedRecordIds,
  };
}
