'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAdminStore } from '@/store/adminStore';
import { Lock, User, ArrowLeft, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAdminStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  console.log('[AdminLoginPage] 渲染，isLoggedIn:', isLoggedIn);

  // 如果已经登录，跳转到管理仪表板
  useEffect(() => {
    console.log('[AdminLoginPage] useEffect 触发，isLoggedIn:', isLoggedIn);
    if (isLoggedIn) {
      console.log('[AdminLoginPage] 已登录，跳转到 /admins/dashboard');
      router.push('/admins/dashboard');
    }
  }, [isLoggedIn, router]);

  // 如果已经登录，显示加载状态
  if (isLoggedIn) {
    console.log('[AdminLoginPage] 已登录，显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">登录成功，正在跳转... (isLoggedIn: {String(isLoggedIn)})</p>
        </div>
      </div>
    );
  }

  console.log('[AdminLoginPage] 显示登录表单');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AdminLoginPage] handleSubmit 被调用');
    console.log('[AdminLoginPage] 用户名:', username);
    console.log('[AdminLoginPage] 密码:', password ? '***' : '空');
    
    setError('');
    setIsLoading(true);

    try {
      console.log('[AdminLoginPage] 调用 login 函数...');
      const success = await login(username, password);
      console.log('[AdminLoginPage] login 返回结果:', success);
      
      if (success) {
        console.log('[AdminLoginPage] 登录成功，跳转到 /admins/dashboard');
        router.push('/admins/dashboard');
      } else {
        console.log('[AdminLoginPage] 登录失败，显示错误');
        setError('用户名或密码错误');
      }
    } catch (err) {
      console.error('[AdminLoginPage] 登录异常:', err);
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Lock className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center mt-4">管理员登录</CardTitle>
          <CardDescription className="text-center">
            登录后可管理授权码和模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
