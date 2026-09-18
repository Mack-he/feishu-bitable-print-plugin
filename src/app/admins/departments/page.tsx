'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminStore } from '@/store/adminStore';
import { DepartmentManager } from '@/components/admin/DepartmentManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function DepartmentsPage() {
  const router = useRouter();
  const { isLoggedIn, token } = useAdminStore();

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
      <div className="flex items-center gap-4">
        <Link href="/admins/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">部门管理</h1>
          <p className="text-muted-foreground">
            从飞书通讯录同步部门与成员，用于按部门授权模板（同步按 user_id 查询用户所属部门）
          </p>
        </div>
      </div>

      <DepartmentManager adminToken={token} />
    </div>
  );
}