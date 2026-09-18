'use client';

import { create } from 'zustand';
import { useUserStore } from './userStore';
import type { PaperPresetLike } from '@/lib/paper';

/**
 * 自定义纸张预设
 *
 * 可见范围（由服务端保证）：
 * - 自己创建的：可改、可删、可设为公开
 * - 他人公开的：只读可用（isOwner === false）
 * - 管理员停用的（status !== 'active'）不会下发到列表
 */
export interface PaperPreset extends PaperPresetLike {
  isPublic: boolean;
  status: string;
  isOwner: boolean;
  /** 系统纸张（管理员创建），所有用户只读可用 */
  isSystem: boolean;
  ownerName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaperPresetInput {
  name: string;
  widthMm: number;
  heightMm: number;
  isPublic?: boolean;
}

interface PaperPresetState {
  presets: PaperPreset[];
  isLoading: boolean;
  error: string | null;

  fetchPresets: () => Promise<void>;
  createPreset: (input: PaperPresetInput) => Promise<PaperPreset>;
  updatePreset: (id: number, input: Partial<PaperPresetInput>) => Promise<PaperPreset>;
  deletePreset: (id: number) => Promise<void>;

  /** 退出登录/切换账号时清空，避免上一个账号的纸张残留 */
  reset: () => void;
  clearError: () => void;
}

// 统一兼容 snake_case / camelCase（Drizzle 直接返回 camelCase，历史数据可能是 snake_case）
export function normalizePaperPreset(raw: any): PaperPreset {
  const createdAt = raw?.createdAt ?? raw?.created_at;
  const updatedAt = raw?.updatedAt ?? raw?.updated_at;
  return {
    id: Number(raw?.id),
    name: String(raw?.name ?? ''),
    widthMm: Number(raw?.widthMm ?? raw?.width_mm ?? 0),
    heightMm: Number(raw?.heightMm ?? raw?.height_mm ?? 0),
    isPublic: Boolean(raw?.isPublic ?? raw?.is_public ?? false),
    status: String(raw?.status ?? 'active'),
    isOwner: Boolean(raw?.isOwner ?? raw?.is_owner ?? false),
    isSystem: Boolean(raw?.isSystem ?? raw?.is_system ?? false),
    ownerName: raw?.ownerName ?? raw?.owner_name ?? null,
    createdAt: createdAt ? new Date(createdAt) : undefined,
    updatedAt: updatedAt ? new Date(updatedAt) : undefined,
  };
}

function authHeaders(token: string, json = false): HeadersInit {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

export const usePaperPresetStore = create<PaperPresetState>()((set) => ({
  presets: [],
  isLoading: false,
  error: null,

  fetchPresets: async () => {
    const token = useUserStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/paper-presets', { headers: authHeaders(token) });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取纸张列表失败');
      }
      set({ presets: (result.data || []).map(normalizePaperPreset), isLoading: false });
    } catch (error) {
      console.error('[PaperPresetStore] 获取纸张列表失败:', error);
      set({
        error: error instanceof Error ? error.message : '获取纸张列表失败',
        isLoading: false,
      });
    }
  },

  createPreset: async (input) => {
    const token = useUserStore.getState().token;
    if (!token) throw new Error('未登录');

    const response = await fetch('/api/paper-presets', {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '创建纸张失败');
    }
    const preset = normalizePaperPreset(result.data);
    set((state) => ({ presets: [...state.presets, preset] }));
    return preset;
  },

  updatePreset: async (id, input) => {
    const token = useUserStore.getState().token;
    if (!token) throw new Error('未登录');

    const response = await fetch(`/api/paper-presets/${id}`, {
      method: 'PUT',
      headers: authHeaders(token, true),
      body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '保存纸张失败');
    }
    const preset = normalizePaperPreset(result.data);
    set((state) => ({ presets: state.presets.map((item) => (item.id === id ? preset : item)) }));
    return preset;
  },

  deletePreset: async (id) => {
    const token = useUserStore.getState().token;
    if (!token) throw new Error('未登录');

    const response = await fetch(`/api/paper-presets/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '删除纸张失败');
    }
    set((state) => ({ presets: state.presets.filter((item) => item.id !== id) }));
  },

  reset: () => set({ presets: [], isLoading: false, error: null }),
  clearError: () => set({ error: null }),
}));

/**
 * 供各类预览/画布组件使用的纸张列表。
 * 组件只需要「读」列表来做尺寸解析，写操作走 store 方法。
 */
export function usePaperPresets(): PaperPreset[] {
  return usePaperPresetStore((state) => state.presets);
}