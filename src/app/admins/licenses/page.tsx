'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import { LicenseManager } from '@/components/admin/LicenseManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LicensesPage() {
  const router = useRouter();
  const { isLoggedIn, token } = useAdminStore();

  // 检查登录状态
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/admins/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-orange-500" />
            <p className="text-muted-foreground">请先登录管理员账号</p>
            <Link href="/admins/login">
              <Button>去登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href="/admins/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">插件授权码</h1>
          <p className="text-muted-foreground">
            生成和管理插件访问授权码，控制用户对插件的使用权限
          </p>
        </div>
      </div>

      {/* 授权码管理组件 */}
      <LicenseManager adminToken={token} />
    </div>
  );
}
