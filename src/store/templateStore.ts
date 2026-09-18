import { create } from 'zustand';
import { useUserStore } from './userStore';

// 模板数据类型
export interface Template {
  id: number;
  userId?: number;
  name: string;
  description?: string;
  thumbnail?: string;
  data: any; // 完整的编辑器状态
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 兼容旧代码的别名
export type UserTemplate = Template;

// 统一转换后端返回的模板数据：
// Supabase 时代 API 返回 snake_case，Drizzle 直接返回 camelCase，两种都要兼容
function normalizeTemplate(t: any): Template {
  let parsedData = t.data;
  if (typeof t.data === 'string') {
    try {
      parsedData = JSON.parse(t.data);
    } catch {
      parsedData = {};
    }
  }

  const createdAt = t.createdAt ?? t.created_at;
  const updatedAt = t.updatedAt ?? t.updated_at;

  return {
    ...t,
    data: parsedData ?? {},
    userId: t.userId ?? t.user_id,
    isPublic: t.isPublic ?? t.is_public ?? false,
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
  };
}

interface TemplateStore {
  templates: Template[];
  currentTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
  
  // 从数据库加载模板
  fetchTemplates: () => Promise<void>;
  
  // 保存模板到数据库
  saveTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Template>;
  
  // 更新模板
  updateTemplate: (id: number, updates: Partial<Template>) => Promise<Template>;
  
  // 删除模板
  deleteTemplate: (id: number) => Promise<void>;
  
  // 设置当前模板
  setCurrentTemplate: (template: Template | null) => void;
  
  // 清除错误
  clearError: () => void;
}

export const useTemplateStore = create<TemplateStore>()((set) => ({
      templates: [],
      currentTemplate: null,
      isLoading: false,
      error: null,

      fetchTemplates: async () => {
        const token = useUserStore.getState().token;
        if (!token) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/templates', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const result = await response.json();
          if (result.success) {
            const templates = result.data.map(normalizeTemplate);
            set({ templates, isLoading: false });
          } else {
            throw new Error(result.error || '获取模板失败');
          }
        } catch (error) {
          console.error('获取模板失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '获取模板失败',
            isLoading: false 
          });
        }
      },

      saveTemplate: async (template) => {
        const token = useUserStore.getState().token;
        if (!token) {
          throw new Error('未登录');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/templates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(template),
          });

          const result = await response.json();
          if (result.success) {
            const newTemplate = normalizeTemplate(result.data);
            set((state) => ({ 
              templates: [newTemplate, ...state.templates],
              isLoading: false 
            }));
            return newTemplate;
          } else {
            throw new Error(result.error || '保存模板失败');
          }
        } catch (error) {
          console.error('保存模板失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '保存模板失败',
            isLoading: false 
          });
          throw error;
        }
      },

      updateTemplate: async (id, updates) => {
        const token = useUserStore.getState().token;
        if (!token) {
          throw new Error('未登录');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/templates/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });

          const result = await response.json();
          if (result.success) {
            const updatedTemplate = normalizeTemplate(result.data);
            set((state) => ({ 
              templates: state.templates.map(t => t.id === id ? updatedTemplate : t),
              currentTemplate: state.currentTemplate?.id === id ? updatedTemplate : state.currentTemplate,
              isLoading: false 
            }));
            return updatedTemplate;
          } else {
            throw new Error(result.error || '更新模板失败');
          }
        } catch (error) {
          console.error('更新模板失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '更新模板失败',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteTemplate: async (id) => {
        const token = useUserStore.getState().token;
        const state = useTemplateStore.getState();
        
        console.log('[TemplateStore] 删除模板:', { 
          id, 
          可用模板: state.templates.map(t => ({ id: t.id, name: t.name })),
          当前模板ID: state.currentTemplate?.id
        });
        
        if (!token) {
          throw new Error('未登录');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/templates/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const result = await response.json();
          if (result.success) {
            set((state) => ({ 
              templates: state.templates.filter(t => t.id !== id),
              currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
              isLoading: false 
            }));
          } else {
            // 如果是404错误，自动刷新模板列表
            if (response.status === 404) {
              console.warn('[TemplateStore] 模板不存在，刷新模板列表');
              // 异步刷新模板列表
              useTemplateStore.getState().fetchTemplates();
            }
            throw new Error(result.error || '删除模板失败');
          }
        } catch (error) {
          console.error('删除模板失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '删除模板失败',
            isLoading: false 
          });
          throw error;
        }
      },

      setCurrentTemplate: (template) => {
        set({ currentTemplate: template });
      },

      clearError: () => {
        set({ error: null });
      },
    })
  );
