import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 管理员用户类型
interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 模板类型
interface Template {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  feishuUserId: string;
  name: string;
  description: string;
  data: any; // 完整的模板数据（包含组件、页面配置等）
  config?: Record<string, unknown>; // 兼容旧代码
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// 管理员状态
interface AdminState {
  // 登录状态
  isLoggedIn: boolean;
  adminUser: AdminUser | null;
  token: string | null;

  // 数据
  templates: Template[];

  // 操作方法
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;

  // 模板管理
  fetchTemplates: () => Promise<void>;
  addTemplate: (data: { name: string; description: string; data?: any }) => Promise<void>;
  updateTemplate: (id: number, data: { name?: string; description?: string; data?: any }) => Promise<void>;
  deleteTemplate: (id: number) => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isLoggedIn: false,
      adminUser: null,
      token: null,
      templates: [],

      // 登录
      login: async (username: string, password: string): Promise<boolean> => {
        console.log('[adminStore] login 被调用');

        try {
          const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const result = await response.json();

          if (result.success && result.data?.token) {
            console.log('[adminStore] 登录成功');
            set({
              isLoggedIn: true,
              adminUser: result.data.admin,
              token: result.data.token,
            });
            return true;
          } else {
            console.log('[adminStore] 登录失败:', result.error);
            return false;
          }
        } catch (error) {
          console.error('[adminStore] 登录请求失败:', error);
          return false;
        }
      },

      // 登出
      logout: () => {
        console.log('[adminStore] logout 被调用');
        set({
          isLoggedIn: false,
          adminUser: null,
          token: null,
          templates: [],
        });
      },

      // 模板管理
      fetchTemplates: async () => {
        const { token } = get();
        if (!token) {
          console.error('[adminStore] 未登录，无法获取模板');
          return;
        }

        try {
          console.log('[adminStore] 获取模板列表...');
          const response = await fetch('/api/admin/templates', {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          const result = await response.json();

          if (result.success && result.data) {
            console.log('[adminStore] 获取到', result.data.length, '条模板');
            set({ templates: result.data });
          } else {
            console.error('[adminStore] 获取模板失败:', result.error);
          }
        } catch (error) {
          console.error('[adminStore] 获取模板请求失败:', error);
        }
      },

      addTemplate: async (data: { name: string; description: string; data?: any }) => {
        console.log('[adminStore] addTemplate 被调用', data);
        // TODO: 管理员后台不直接添加模板，由用户在前端创建
      },

      updateTemplate: async (id: number, data: { name?: string; description?: string; data?: any; isPublic?: boolean }) => {
        const { token, templates } = get();
        if (!token) return;

        try {
          const response = await fetch('/api/admin/templates', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ id, ...data }),
          });

          const result = await response.json();

          if (result.success) {
            // 更新本地状态
            set({
              templates: templates.map(t =>
                t.id === id ? { ...t, ...data } : t
              ),
            });
          } else {
            console.error('[adminStore] 更新模板失败:', result.error);
          }
        } catch (error) {
          console.error('[adminStore] 更新模板请求失败:', error);
        }
      },

      deleteTemplate: async (id: number) => {
        const { token, templates } = get();
        if (!token) return;

        try {
          const response = await fetch(`/api/admin/templates?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          const result = await response.json();

          if (result.success) {
            // 从本地状态中移除
            set({
              templates: templates.filter(t => t.id !== id),
            });
            console.log('[adminStore] 模板已删除');
          } else {
            console.error('[adminStore] 删除模板失败:', result.error);
          }
        } catch (error) {
          console.error('[adminStore] 删除模板请求失败:', error);
        }
      },
    }),
    {
      name: 'admin-storage',
    }
  )
);
