'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Home,
  Ticket,
  Key,
} from 'lucide-react';

const navItems = [
  { href: '/admins/dashboard', label: '仪表板', icon: LayoutDashboard },
  { href: '/admins/licenses', label: '授权码管理', icon: Ticket },
  { href: '/admins/templates', label: '模板管理', icon: FileText },
  { href: '/admins/settings', label: '系统设置', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, logout } = useAdminStore();

  console.log('[AdminLayout] 渲染');
  console.log('[AdminLayout] pathname:', pathname);
  console.log('[AdminLayout] isLoggedIn:', isLoggedIn);

  // 如果是登录页面，不检查登录状态（支持结尾带斜杠的情况）
  const isLoginPage = pathname === '/admins/login' || pathname === '/admins/login/';

  // 使用 useEffect 处理路由跳转（必须在所有条件判断之前）
  useEffect(() => {
    console.log('[AdminLayout] useEffect 触发');
    console.log('[AdminLayout] isLoggedIn:', isLoggedIn);
    console.log('[AdminLayout] isLoginPage:', isLoginPage);
    
    if (!isLoginPage && !isLoggedIn) {
      console.log('[AdminLayout] 未登录，跳转到 /admins/login');
      router.push('/admins/login');
    } else if (isLoginPage && isLoggedIn) {
      console.log('[AdminLayout] 已登录但在登录页面，跳转到 /admins/dashboard');
      router.push('/admins/dashboard');
    } else {
      console.log('[AdminLayout] 状态正常，不跳转');
    }
  }, [isLoggedIn, router, isLoginPage]);

  if (isLoginPage) {
    console.log('[AdminLayout] 是登录页面，直接返回 children');
    return <>{children}</>;
  }

  console.log('[AdminLayout] 不是登录页面，检查登录状态');

  // 如果未登录，显示加载状态
  if (!isLoggedIn) {
    console.log('[AdminLayout] 未登录，显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">检查登录状态... (isLoggedIn: {String(isLoggedIn)})</p>
        </div>
      </div>
    );
  }

  console.log('[AdminLayout] 已登录，渲染管理界面');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex h-screen">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Key className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">管理后台</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                typeof window !== 'undefined' &&
                window.location.pathname === item.href;

              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
