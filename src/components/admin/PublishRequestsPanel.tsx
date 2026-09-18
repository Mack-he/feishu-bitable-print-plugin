'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { SubjectPicker } from '@/components/shared/SubjectPicker';
import type { TemplateGrantEntry } from '@/store/templateStore';

interface PublishRequestRow {
  id: number;
  templateId: number;
  templateName: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  note: string | null;
  status: string;
  rejectReason: string | null;
  enterpriseTemplateId: number | null;
  createdAt: string;
}

type Visibility = 'public' | 'restricted';

/**
 * 企业模板发布申请：列表 + 审批（通过时生成企业模板并可直接配置授权）
 */
export function PublishRequestsPanel({ adminToken }: { adminToken: string }) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rows, setRows] = useState<PublishRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [approveTarget, setApproveTarget] = useState<PublishRequestRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PublishRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [grants, setGrants] = useState<TemplateGrantEntry[]>([]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(
    async (nextStatus = status) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/template-publish-requests?status=${nextStatus}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '获取发布申请失败');
        setRows(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取发布申请失败');
      } finally {
        setIsLoading(false);
      }
    },
    [adminToken, status]
  );

  useEffect(() => {
    fetchRequests('pending');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitReview = async (requestId: number, body: Record<string, unknown>) => {
    setIsSubmitting(true);
    setDialogError(null);
    try {
      const response = await fetch(`/api/admin/template-publish-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '操作失败');

      setApproveTarget(null);
      setRejectTarget(null);
      setGrants([]);
      setRejectReason('');
      fetchRequests();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border rounded-md overflow-hidden">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((item) => (
            <Button
              key={item}
              variant={status === item ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => {
                setStatus(item);
                fetchRequests(item);
              }}
            >
              {item === 'pending' ? '待审核' : item === 'approved' ? '已通过' : item === 'rejected' ? '已驳回' : '全部'}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchRequests()} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          刷新
        </Button>
        <span className="text-sm text-muted-foreground">共 {rows.length} 条</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>申请说明</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.templateName || `模板#${row.templateId}`}</TableCell>
                    <TableCell>
                      <div className="text-sm">{row.applicantName || '未知用户'}</div>
                      <div className="text-xs text-muted-foreground">{row.applicantEmail || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{row.note || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === 'pending' ? 'secondary' : row.status === 'approved' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {row.status === 'pending' ? '待审核' : row.status === 'approved' ? '已通过' : '已驳回'}
                      </Badge>
                      {row.rejectReason && (
                        <p className="text-xs text-muted-foreground mt-1">{row.rejectReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setApproveTarget(row);
                              setEnterpriseName(row.templateName || '');
                              setVisibility('public');
                              setGrants([]);
                              setDialogError(null);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setRejectTarget(row);
                              setRejectReason('');
                              setDialogError(null);
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            驳回
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.enterpriseTemplateId ? `企业模板 #${row.enterpriseTemplateId}` : '-'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 通过：生成企业模板 + 配置授权 */}
      <Dialog open={!!approveTarget} onOpenChange={(next) => !next && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>通过发布申请</DialogTitle>
            <DialogDescription>将生成企业模板（内容取申请模板的当前快照），并立即配置授权范围</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="enterprise-name">企业模板名称</Label>
              <Input
                id="enterprise-name"
                value={enterpriseName}
                onChange={(event) => setEnterpriseName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>可见范围</Label>
              <div className="flex border rounded-md overflow-hidden w-fit">
                <Button
                  variant={visibility === 'public' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setVisibility('public')}
                >
                  所有用户
                </Button>
                <Button
                  variant={visibility === 'restricted' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setVisibility('restricted')}
                >
                  指定用户和部门
                </Button>
              </div>
            </div>

            {visibility === 'restricted' && (
              <div className="rounded-lg border p-3">
                <SubjectPicker value={grants} onChange={setGrants} disabled={isSubmitting} />
              </div>
            )}

            {dialogError && <p className="text-xs text-destructive">{dialogError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              disabled={isSubmitting || !enterpriseName.trim() || (visibility === 'restricted' && grants.length === 0)}
              onClick={() =>
                approveTarget &&
                submitReview(approveTarget.id, {
                  action: 'approve',
                  name: enterpriseName.trim(),
                  visibility,
                  grants: grants.map((entry) => ({
                    subjectType: entry.subjectType,
                    subjectId: entry.subjectId,
                    includeSubDepartments: entry.includeSubDepartments !== false,
                  })),
                })
              }
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              通过并生成企业模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回 */}
      <Dialog open={!!rejectTarget} onOpenChange={(next) => !next && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>驳回发布申请</DialogTitle>
            <DialogDescription>驳回理由会展示给申请者</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">驳回理由</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              placeholder="例如：内容需要先补充公司抬头与盖章位"
              onChange={(event) => setRejectReason(event.target.value)}
            />
            {dialogError && <p className="text-xs text-destructive">{dialogError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting || !rejectReason.trim()}
              onClick={() => rejectTarget && submitReview(rejectTarget.id, { action: 'reject', rejectReason })}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}