'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Ticket,
  FileText,
  Users,
  Activity,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface LicenseStats {
  status: {
    total: number;
    unused: number;
    active: number;
    expired: number;
    revoked: number;
  };
}

export default function AdminDashboardPage() {
  const { adminUser, templates, token } = useAdminStore();
  const [licenseStats, setLicenseStats] = useState<LicenseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 获取授权码统计数据
  useEffect(() => {
    const fetchLicenseStats = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/admin/licenses/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data) {
          setLicenseStats(result.data);
        }
      } catch (error) {
        console.error('获取授权码统计失败:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchLicenseStats();
  }, [token]);

  const stats = [
    {
      title: '授权码总数',
      value: licenseStats?.status.total ?? 0,
      icon: Ticket,
      description: '已生成的授权码数量',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: '活跃授权码',
      value: licenseStats?.status.active ?? 0,
      icon: CheckCircle2,
      description: '当前已绑定的授权码',
      color: 'from-green-500 to-green-600',
    },
    {
      title: '模板总数',
      value: templates.length,
      icon: FileText,
      description: '已创建的模板数量',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: '管理员',
      value: 1,
      icon: Users,
      description: '系统管理员数量',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const recentActivity = [
    { action: '新增授权码', tableName: '客户信息表', time: '5分钟前' },
    { action: '更新模板', templateName: '发票打印模板', time: '1小时前' },
    { action: '激活授权码', tableName: '订单记录表', time: '2小时前' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表板</h1>
          <p className="text-muted-foreground">
            欢迎回来，{adminUser?.name || '管理员'}
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>快速进行常用操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admins/licenses">
                <Button className="justify-start w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  新增授权码
                </Button>
              </Link>
              <Link href="/admins/templates">
                <Button className="justify-start w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  新增模板
                </Button>
              </Link>
              <Link href="/admins/licenses">
                <Button className="justify-start w-full" variant="outline">
                  <Ticket className="h-4 w-4 mr-2" />
                  查看授权码
                </Button>
              </Link>
              <Link href="/admins/templates">
                <Button className="justify-start w-full" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  查看模板
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 最近活动 */}
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
            <CardDescription>系统最近的操作记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.tableName || activity.templateName}
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 资源概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 授权码列表 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>授权码概览</CardTitle>
              <CardDescription>插件授权码使用情况</CardDescription>
            </div>
            <Link href="/admins/licenses">
              <Button variant="ghost" size="sm">
                查看全部
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                请前往「插件授权码」页面查看和管理授权码
              </div>
              <Link href="/admins/licenses">
                <Button variant="outline" className="w-full">
                  <Ticket className="h-4 w-4 mr-2" />
                  进入授权码管理
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 模板列表 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>模板概览</CardTitle>
              <CardDescription>已创建的模板</CardDescription>
            </div>
            <Link href="/admins/templates">
              <Button variant="ghost" size="sm">
                查看全部
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.slice(0, 3).map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
