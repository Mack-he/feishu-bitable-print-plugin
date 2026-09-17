'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LicenseGateProps {
  userId: string;
  userName: string;
  onActivated: () => void;
  isExpired?: boolean;
  expiredMessage?: string;
}

/**
 * 授权码输入门控组件
 * 用户未授权或授权过期时显示
 */
export function LicenseGate({
  userId,
  userName,
  onActivated,
  isExpired = false,
  expiredMessage = '您的授权已过期，请输入新的授权码继续使用',
}: LicenseGateProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * 格式化输入的授权码
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    
    // 只允许字母和数字
    value = value.replace(/[^A-Z0-9]/g, '');
    
    // 自动添加分隔符
    const groups: string[] = [];
    for (let i = 0; i < value.length && i < 16; i += 4) {
      groups.push(value.substring(i, i + 4));
    }
    
    setCode(groups.join('-'));
    setError(null);
  }, []);

  /**
   * 提交授权码
   */
  const handleSubmit = useCallback(async () => {
    if (code.replace(/-/g, '').length !== 16) {
      setError('请输入完整的16位授权码');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          userId,
          userName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '授权码无效');
      }

      setSuccess(true);
      
      // 延迟后通知父组件
      setTimeout(() => {
        onActivated();
      }, 1500);
    } catch (err) {
      console.error('[LicenseGate] 激活失败:', err);
      setError(err instanceof Error ? err.message : '激活失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [code, userId, userName, onActivated]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  }, [handleSubmit, isLoading]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {isExpired ? '授权已过期' : '请输入授权码'}
          </CardTitle>
          <CardDescription>
            {isExpired ? expiredMessage : '请联系管理员获取授权码以继续使用插件'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {success ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                授权码激活成功！正在进入插件...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  授权码
                </label>
                <Input
                  value={code}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  maxLength={19} // 16位 + 3个分隔符
                  disabled={isLoading}
                  className={cn(
                    "text-center text-lg tracking-wider font-mono uppercase",
                    error && "border-red-500 focus-visible:ring-red-500"
                  )}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  输入16位授权码，自动格式化
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                disabled={code.replace(/-/g, '').length !== 16 || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    验证中...
                  </>
                ) : (
                  '激活授权码'
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>用户：{userName}</p>
                <p>ID：{userId}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LicenseGate;
