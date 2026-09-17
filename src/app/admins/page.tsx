'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';

export default function AdminIndexPage() {
  const router = useRouter();
  const { isLoggedIn } = useAdminStore();

  console.log('[AdminIndexPage] 渲染，isLoggedIn:', isLoggedIn);

  useEffect(() => {
    console.log('[AdminIndexPage] useEffect 触发，isLoggedIn:', isLoggedIn);
    if (isLoggedIn) {
      console.log('[AdminIndexPage] 已登录，跳转到 /admins/dashboard');
      router.push('/admins/dashboard');
    } else {
      console.log('[AdminIndexPage] 未登录，跳转到 /admins/login');
      router.push('/admins/login');
    }
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">正在重定向... (isLoggedIn: {String(isLoggedIn)})</p>
      </div>
    </div>
  );
}
