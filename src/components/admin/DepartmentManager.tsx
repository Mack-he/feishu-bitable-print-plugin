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
import { AlertCircle, Loader2, RefreshCw, Trash2, Users } from 'lucide-react';

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

interface ScheduleStatus {
  enabled: boolean;
  times: string[];
  usingDefaultTimes: boolean;
  lastRun: { at: string; slot: string; ok: boolean; message: string } | null;
  cursor: number;
  running: boolean;
}

interface Meta {
  departmentCount: number;
  linkedUserCount: number;
  lastSyncedAt: string | null;
  schedule: ScheduleStatus | null;
}

interface SyncProgress {
  total: number;
  nextOffset: number;
  remaining: number;
}

interface SkippedUser {
  userId: number;
  name: string | null;
  reason: string;
}

const COLUMN_COUNT = 7;

/**
 * 部门管理：从飞书通讯录同步部门树与用户-部门关系（按 user_id 查询）
 * 权限未开通时会给出明确的引导提示
 */
export function DepartmentManager({ adminToken }: { adminToken: string }) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [skippedUsers, setSkippedUsers] = useState<SkippedUser[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

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

  /** userOffset 用于分批续传：0 表示从头开始，其余传上一次返回的 nextOffset */
  const runSync = async (userOffset = 0) => {
    setIsSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/departments/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userOffset }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '同步失败');

      const skipped: SkippedUser[] = result.data?.skippedUsers || [];
      const skippedCount: number = result.data?.skippedUserCount ?? skipped.length;
      const userSync = result.data?.userSync;
      setMessage(
        `${result.message || '同步完成'}${skippedCount ? `；${skippedCount} 个用户未匹配到部门` : ''}`
      );
      setSkippedUsers(skipped);
      setSkippedCount(skippedCount);
      setSyncProgress(userSync && userSync.remaining > 0 ? userSync : null);
      await fetchDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (department: DepartmentRow) => {
    const confirmed = confirm(
      `删除本地部门「${department.name}」？\n\n该部门的用户关联与授权记录会一并删除；飞书侧不受影响，若部门仍在飞书会随下次同步重新出现。`
    );
    if (!confirmed) return;

    setDeletingId(department.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/departments?id=${department.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '删除失败');
      setMessage(`已删除「${department.name}」`);
      await fetchDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const depthOf = (department: DepartmentRow) =>
    Math.max(0, (department.path || '').split(',').filter(Boolean).length - 1);

  const inactiveCount = departments.filter((department) => department.status !== 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => runSync(0)} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          同步通讯录
        </Button>
        {syncProgress && (
          <Button variant="outline" onClick={() => runSync(syncProgress.nextOffset)} disabled={isSyncing}>
            继续同步剩余 {syncProgress.remaining} 人
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          部门 {meta?.departmentCount ?? 0} 个 · 已关联用户 {meta?.linkedUserCount ?? 0} 人
          {inactiveCount > 0 ? ` · 失效 ${inactiveCount} 个` : ''}
          {meta?.lastSyncedAt ? ` · 上次同步 ${new Date(meta.lastSyncedAt).toLocaleString()}` : ' · 尚未同步'}
        </span>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}

      {meta?.schedule && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>
            定时同步：
            {meta.schedule.enabled
              ? `每天 ${meta.schedule.times.join('、')}（内置调度，服务器本地时间${
                  meta.schedule.usingDefaultTimes ? '，默认时间点' : ''
                }）`
              : '未启用'}
            {meta.schedule.lastRun
              ? ` · 上次自动同步 ${new Date(meta.schedule.lastRun.at).toLocaleString()} ${
                  meta.schedule.lastRun.ok ? '成功' : '失败'
                }：${meta.schedule.lastRun.message}`
              : ' · 尚未自动同步过'}
            {meta.schedule.running ? ' · 当前有同步在执行' : ''}
          </p>
          {!meta.schedule.enabled && (
            <p>
              需要应用内置定时同步时，在 .env 里加 <code>DEPARTMENT_SYNC_SCHEDULE_ENABLED=true</code>
              （默认每天 03:00、15:00，可用 <code>DEPARTMENT_SYNC_SCHEDULE</code> 自定义），重启后生效；
              已经用 XXL-Job 等外部调度器触发则不必开启。
            </p>
          )}
          {meta.schedule.enabled && meta.schedule.lastRun && !meta.schedule.lastRun.ok && (
            <p className="text-amber-700">
              上次自动同步失败，多为飞书通讯录权限未开通或应用配置问题，可参照下方提示排查。
            </p>
          )}
        </div>
      )}

      {syncProgress && (
        <p className="text-xs text-muted-foreground">
          已刷新 {syncProgress.nextOffset}/{syncProgress.total} 人的部门归属，
          点「继续同步剩余 {syncProgress.remaining} 人」可接着刷新（其余用户登录时也会自动刷新）。
        </p>
      )}

      {inactiveCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-2 p-4 text-amber-800">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium">{inactiveCount} 个部门已失效</p>
              <p>
                这些部门在飞书侧已删除或不在应用可见范围，已从授权选择器中移除，也不再参与访问判定；
                如果确认不再需要，可删除本地记录（会一并删除其授权记录）。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {skippedCount > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>以下用户未能匹配到部门（可检查飞书侧用户状态或应用可见范围）：</p>
          {skippedUsers.slice(0, 5).map((item) => (
            <p key={item.userId} className="font-mono">
              {item.name || `用户#${item.userId}`}：{item.reason}
            </p>
          ))}
          {skippedCount > skippedUsers.length && (
            <p>…等 {skippedCount} 人（此处仅展示前 {skippedUsers.length} 条）</p>
          )}
        </div>
      )}

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
                <TableHead>状态</TableHead>
                <TableHead>同步时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground py-10">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无部门数据，点击「同步通讯录」从飞书拉取
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((department) => {
                  const isInactive = department.status !== 'active';
                  return (
                    <TableRow key={department.id} className={isInactive ? 'opacity-60' : undefined}>
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
                      <TableCell>
                        <Badge variant={isInactive ? 'destructive' : 'outline'} className="text-xs">
                          {isInactive ? '已失效' : '有效'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {department.lastSyncedAt ? new Date(department.lastSyncedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingId === department.id}
                            onClick={() => handleDelete(department)}
                          >
                            {deletingId === department.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}