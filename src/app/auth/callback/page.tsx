'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/store/userStore';
import { useTemplateStore } from '@/store/templateStore';

// 从 cookie 读取 token 的辅助函数
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop();
    return cookieValue ? cookieValue.split(';').shift() || null : null;
  }
  return null;
}

// 实际的回调处理组件
function AuthCallbackContent() {
  const router = useRouter();
  const { setUser, setToken, setHasAuthorizations } = useUserStore();
  const { fetchTemplates } = useTemplateStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] 开始处理回调');

        // 从 URL 读取参数（避免 useSearchParams 问题）
        const urlParams = new URLSearchParams(window.location.search);
        const token = getCookie('auth_token');
        const userId = urlParams.get('userId');
        const name = urlParams.get('name');
        const hasAuthorizations = urlParams.get('hasAuthorizations') === 'true';
        const errorParam = urlParams.get('error');

        console.log('[Auth Callback] 完整URL参数:', Object.fromEntries(urlParams.entries()));
        console.log('[Auth Callback] 从 cookie 获取 token:', token ? '存在' : '不存在');
        console.log('[Auth Callback] userId:', userId);
        console.log('[Auth Callback] name:', name);
        console.log('[Auth Callback] hasAuthorizations:', hasAuthorizations);

        if (errorParam) {
          console.error('[Auth Callback] 收到错误:', errorParam);
          throw new Error(errorParam);
        }

        if (!token || !userId) {
          console.error('[Auth Callback] 缺少必要参数');
          throw new Error('缺少必要的登录信息');
        }

        console.log('[Auth Callback] 参数验证成功');

        // 保存 token 和用户信息
        setToken(token);
        setUser({
          id: userId,
          name: name || '',
        });
        setHasAuthorizations(hasAuthorizations);

        console.log('[Auth Callback] 用户信息已保存');

        // 加载模板
        await fetchTemplates();

        console.log('[Auth Callback] 模板已加载');

        setStatus('success');

        // 延迟跳转，让用户看到成功状态
        setTimeout(() => {
          if (hasAuthorizations) {
            router.push('/');
          } else {
            router.push('/bind-auth');
          }
        }, 1000);
      } catch (err) {
        console.error('[Auth Callback] 处理回调失败:', err);
        setError(err instanceof Error ? err.message : '登录失败');
        setStatus('error');

        // 延迟跳转到登录页
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    handleCallback();
  }, [router, setToken, setUser, setHasAuthorizations, fetchTemplates]);

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {status === 'loading' && '登录中...'}
          {status === 'success' && '登录成功！'}
          {status === 'error' && '登录失败'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在处理登录...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-gray-600">正在跳转...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="py-8">
            <div className="text-red-600 text-4xl mb-4">✗</div>
            <p className="text-red-600">{error}</p>
            <p className="text-gray-500 mt-2">正在返回登录页...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 加载状态组件
function AuthCallbackLoading() {
  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">登录中...</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在处理登录...</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 主页面组件 - 使用 Suspense 包裹
export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<AuthCallbackLoading />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
