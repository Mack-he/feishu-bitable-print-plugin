'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editorStore';
import { useUserStore } from '@/store/userStore';
import { useTemplateStore } from '@/store/templateStore';
import { mockBitableData } from '@/data/mockData';
import { Field } from '@/types/editor';
import { HomePage } from '@/components/editor/HomePage';
import { EditorPage } from '@/components/editor/EditorPage';
import TemplatePreview from '@/components/editor/TemplatePreview';
import { PresetTemplate } from '@/types/editor';
import { Loader2 } from 'lucide-react';

type AppView = 'home' | 'editor' | 'preview';

export default function PrintPluginApp() {
  const router = useRouter();
  const [view, setView] = useState<AppView>('home');
  const { setFields, setSystemFields, setTemplateName } = useEditorStore();
  const { user, token, hasAuthorizations, logout, setHasAuthorizations } = useUserStore();
  const { fetchTemplates, setCurrentTemplate, saveTemplate } = useTemplateStore();

  // 计算登录状态
  const isLoggedIn = !!token && !!user;

  // 移除了频繁的 console.log，避免性能问题

  // 检查登录状态（只检查登录，不再检查授权码状态）
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
    // 授权码状态只在飞书登录回调时检查，之后直接依赖 localStorage 中保存的状态
  }, [isLoggedIn, router]);

  // 初始化字段数据并清理旧的 localStorage 数据
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    // 清理旧的 localStorage 模板数据（已改为数据库存储）
    try {
      localStorage.removeItem('template-storage');
    } catch {
      // 忽略清理错误
    }

    // 加载用户模板列表
    fetchTemplates().catch((error) => {
      console.error('[PrintPluginApp] 加载模板列表失败:', error);
    });

    // 从模拟数据或真实数据中获取字段
    const fields: Field[] = mockBitableData.fields.map((field) => {
      // 判断字段种类（使用类型断言绕过 TypeScript 严格检查）
      let fieldKind: Field['fieldKind'] = 'other';
      const fieldType = field.type as string;
      
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
        id: field.id,
        name: field.name,
        type: field.type,
        placeholder: `[${field.name}]`,
        isSystem: false,
        fieldKind,
      };
    });

    const systemFields: Field[] = [
      { id: 'sys_table_name', name: '表格名', type: 'text', placeholder: '[表格名]', isSystem: true },
      { id: 'sys_print_time', name: '打印时间', type: 'text', placeholder: '[打印时间]', isSystem: true },
      { id: 'sys_page_number', name: '页码', type: 'text', placeholder: '[页码]', isSystem: true },
      { id: 'sys_total_pages', name: '总页数', type: 'text', placeholder: '[总页数]', isSystem: true },
    ];

    setFields(fields);
    setSystemFields(systemFields);
  }, [setFields, setSystemFields, isLoggedIn, fetchTemplates]);

  // 处理创建新排版
  const handleCreateNew = async () => {
    try {
      // 先创建一个空模板到数据库
      const newTemplate = await saveTemplate({
        name: '未命名排版',
        description: '',
        data: {},
        isPublic: false,
      });
      setCurrentTemplate(newTemplate);
      setTemplateName(newTemplate.name);
      setView('editor');
    } catch (error) {
      console.error('[PrintPluginApp] 创建新模板失败:', error);
      alert('创建模板失败，请重试');
    }
  };

  // 处理选择预设模板
  const handleSelectTemplate = (template: PresetTemplate) => {
    // TODO: 加载模板配置
    setView('editor');
  };

  // 处理选择用户模板（进入预览）
  const handleSelectUserTemplate = () => {
    setView('preview');
  };

  // 处理从预览进入编辑
  const handleEditTemplate = (template: any) => {
    setCurrentTemplate(template);
    setTemplateName(template.name);
    setView('editor');
  };

  // 处理退出编辑器
  const handleExitEditor = () => {
    setView('home');
  };

  // 处理退出登录
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 处理删除账号
  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        // 清除本地登录状态
        logout();
        // 跳转到登录页面
        router.push('/login');
      } else {
        console.error('[PrintPluginApp] 删除账号失败:', result.error);
        alert('删除账号失败: ' + result.error);
      }
    } catch (error) {
      console.error('[PrintPluginApp] 删除账号请求失败:', error);
      alert('删除账号失败，请稍后重试');
    }
  };

  // 如果未登录，显示加载状态
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在跳转...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 主应用内容 */}
      {view === 'home' && (
        <HomePage
          onCreateNew={handleCreateNew}
          onSelectTemplate={handleSelectTemplate}
          onSelectUserTemplate={handleSelectUserTemplate}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
      {view === 'preview' && (
        <div className="h-screen flex flex-col">
          {/* 顶部返回按钮 */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setView('home')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              ← 返回首页
            </button>
            <span className="text-sm text-gray-500">打印预览模式</span>
          </div>
          {/* 预览内容 */}
          <div className="flex-1 overflow-hidden">
            <TemplatePreview onEditTemplate={handleEditTemplate} />
          </div>
        </div>
      )}
      {view === 'editor' && (
        <EditorPage onExit={handleExitEditor} />
      )}
    </div>
  );
}
