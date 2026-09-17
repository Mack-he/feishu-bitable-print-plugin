'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/store/userStore';

export default function BindAuthPage() {
  const router = useRouter();
  const { user, setHasAuthorizations } = useUserStore();
  const [licenseCode, setLicenseCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 如果用户未登录，跳转到登录页
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('用户未登录');
      return;
    }

    if (!licenseCode.trim()) {
      setError('请输入授权码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 调用授权码验证接口
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: licenseCode.trim(),
          userId: user.id,
          userName: user.name,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // 验证成功，更新状态为已绑定
        setHasAuthorizations(true);
        // 跳转到主页
        router.push('/');
      } else {
        setError(result.error || '授权码验证失败');
      }
    } catch (err) {
      console.error('验证授权码失败:', err);
      setError('验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>绑定授权码</CardTitle>
          <CardDescription>
            请输入您的插件授权码以继续使用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licenseCode">授权码</Label>
              <Input
                id="licenseCode"
                placeholder="例如: EJKD-86WP-S5F6-MENT"
                value={licenseCode}
                onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                required
                maxLength={19}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                授权码为16位字母和数字组合，支持带连字符格式 (XXXX-XXXX-XXXX-XXXX)
              </p>
            </div>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '验证中...' : '验证并继续'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
