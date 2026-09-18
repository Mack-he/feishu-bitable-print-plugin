'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Loader2, RefreshCw, Users } from 'lucide-react';

interface DepartmentRow {
  id: number;
  feishuDepartmentId: string;
  name: string;
  parentFeishuDepartmentId: string | null;
  path: string | null;
  memberCount: number | null;
  status: string;
  lastSyncedAt: string | null;
  linkedUserCount: number;
}

interface Meta {
  departmentCount: number;
  linkedUserCount: number;
  lastSyncedAt: string | null;
}

/**
 * 部门管理：从飞书通讯录同步部门树与用户-部门关系（按 user_id 查询）
 * 权限未开通时会给出明确的引导提示
 */
export function DepartmentManager({ adminToken }: { adminToken: string }) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/departments', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '获取部门列表失败');
      setDepartments(result.data || []);
      setMeta(result.meta || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取部门列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/departments/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '同步失败');

      const skipped = result.data?.skippedUsers || [];
      setMessage(
        `${result.message || '同步完成'}${skipped.length ? `；${skipped.length} 个用户未匹配到部门` : ''}`
      );
      await fetchDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  const depthOf = (department: DepartmentRow) =>
    Math.max(0, (department.path || '').split(',').filter(Boolean).length - 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          同步通讯录
        </Button>
        <span className="text-sm text-muted-foreground">
          部门 {meta?.departmentCount ?? 0} 个 · 已关联用户 {meta?.linkedUserCount ?? 0} 人
          {meta?.lastSyncedAt ? ` · 上次同步 ${new Date(meta.lastSyncedAt).toLocaleString()}` : ' · 尚未同步'}
        </span>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-2 p-4 text-amber-800">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium">同步失败</p>
              <p>{error}</p>
              <p className="text-xs">
                请在飞书开放平台为服务端应用开通「通讯录」相关权限（获取用户基本信息、获取部门信息）并发布生效，
                同时确认应用可见范围覆盖了目标用户；权限未开通时，仍可按「用户」维度配置模板授权。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>部门名称</TableHead>
                <TableHead>飞书部门 ID</TableHead>
                <TableHead>部门人数</TableHead>
                <TableHead>已关联用户</TableHead>
                <TableHead>同步时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无部门数据，点击「同步通讯录」从飞书拉取
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">
                      <span style={{ paddingLeft: `${depthOf(department) * 16}px` }}>{department.name}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {department.feishuDepartmentId}
                    </TableCell>
                    <TableCell>{department.memberCount ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{department.linkedUserCount}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {department.lastSyncedAt ? new Date(department.lastSyncedAt).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}