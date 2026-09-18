'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Ban, CheckCircle2, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  BUILT_IN_PAPERS,
  PAPER_MAX_MM,
  PAPER_MIN_MM,
  PAPER_NAME_MAX_LENGTH,
  isValidPaperMm,
  normalizePaperDims,
  validatePaperName,
} from '@/lib/paper';

interface AdminPaperPreset {
  id: number;
  name: string;
  widthMm: number;
  heightMm: number;
  isPublic: boolean;
  status: string;
  userId: number | null;
  isSystem?: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function PaperPresetManager({ adminToken }: { adminToken: string }) {
  const [presets, setPresets] = useState<AdminPaperPreset[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminPaperPreset | null>(null);
  const [tab, setTab] = useState<'custom' | 'builtin'>('custom');

  // 新增系统纸张
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState('210');
  const [newHeight, setNewHeight] = useState('297');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPresets = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pagination.pageSize) });
        if (keyword.trim()) params.set('keyword', keyword.trim());
        if (status !== 'all') params.set('status', status);

        const response = await fetch(`/api/admin/paper-presets?${params}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '获取纸张列表失败');

        setPresets(result.data || []);
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取纸张列表失败');
      } finally {
        setIsLoading(false);
      }
    },
    [adminToken, keyword, status, pagination.pageSize]
  );

  useEffect(() => {
    fetchPresets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = async (preset: AdminPaperPreset) => {
    const nextStatus = preset.status === 'active' ? 'disabled' : 'active';
    setBusyId(preset.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/paper-presets/${preset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '操作失败');
      setPresets((prev) =>
        prev.map((item) => (item.id === preset.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    setCreateError(null);

    const nameError = validatePaperName(
      newName,
      presets.filter((preset) => preset.isSystem).map((preset) => preset.name)
    );
    if (nameError) {
      setCreateError(nameError);
      return;
    }

    const width = Number(newWidth);
    const height = Number(newHeight);
    if (!isValidPaperMm(width) || !isValidPaperMm(height)) {
      setCreateError(`尺寸需在 ${PAPER_MIN_MM}~${PAPER_MAX_MM} mm 之间`);
      return;
    }

    const normalized = normalizePaperDims(width, height);

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/paper-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          widthMm: normalized.width,
          heightMm: normalized.height,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '新建纸张失败');

      setShowCreate(false);
      setNewName('');
      fetchPresets(1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '新建纸张失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/paper-presets/${pendingDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '删除失败');
      setPendingDelete(null);
      fetchPresets(pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 分类切换 */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as 'custom' | 'builtin')}>
        <TabsList>
          <TabsTrigger value="custom">自定义纸张</TabsTrigger>
          <TabsTrigger value="builtin">内置纸张（{BUILT_IN_PAPERS.length}）</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'builtin' ? (
        <>
          <p className="text-sm text-muted-foreground">
            内置纸张为程序内置常量，不占用数据库、对全部用户可用，且不支持修改；如需新增请切到「自定义纸张」用「新增纸张」创建系统纸张。
          </p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分组</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>尺寸 (mm)</TableHead>
                    <TableHead>可见性</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BUILT_IN_PAPERS.map((paper) => (
                    <TableRow key={paper.key}>
                      <TableCell className="text-muted-foreground">{paper.group}</TableCell>
                      <TableCell className="font-medium">{paper.label}</TableCell>
                      <TableCell>
                        {paper.width}×{paper.height}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">全体用户</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索纸张名称或创建者"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPresets(1)}
            className="pl-10 w-64"
          />
        </div>
        <div className="flex border rounded-md overflow-hidden">
          {(['all', 'active', 'disabled'] as const).map((item) => (
            <Button
              key={item}
              variant={status === item ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setStatus(item)}
            >
              {item === 'all' ? '全部' : item === 'active' ? '启用中' : '已停用'}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPresets(1)} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          查询
        </Button>
        <span className="text-sm text-muted-foreground">共 {pagination.total} 条</span>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => {
            setCreateError(null);
            setNewName('');
            setNewWidth('210');
            setNewHeight('297');
            setShowCreate(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          新增纸张
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>纸张名称</TableHead>
                <TableHead>尺寸 (mm)</TableHead>
                <TableHead>创建者</TableHead>
                <TableHead>可见性</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presets.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                presets.map((preset) => (
                  <TableRow key={preset.id}>
                    <TableCell className="font-medium">{preset.name}</TableCell>
                    <TableCell>
                      {preset.widthMm}×{preset.heightMm}
                    </TableCell>
                    <TableCell>
                      {preset.isSystem ? (
                        <>
                          <div className="text-sm">系统纸张</div>
                          <div className="text-xs text-muted-foreground">管理员创建</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm">{preset.ownerName || '未知用户'}</div>
                          <div className="text-xs text-muted-foreground">{preset.ownerEmail || `#${preset.userId ?? '-'}`}</div>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={preset.isSystem || preset.isPublic ? 'default' : 'secondary'} className="text-xs">
                        {preset.isSystem ? '系统共享' : preset.isPublic ? '公开' : '私有'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={preset.status === 'active' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {preset.status === 'active' ? '启用中' : '已停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(preset)}
                          disabled={busyId === preset.id}
                        >
                          {busyId === preset.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : preset.status === 'active' ? (
                            <Ban className="w-3.5 h-3.5 mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          {preset.status === 'active' ? '停用' : '启用'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(preset)}
                          disabled={busyId === preset.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => fetchPresets(pagination.page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => fetchPresets(pagination.page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
        </>
      )}

      {/* 新增系统纸张 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增系统纸张</DialogTitle>
            <DialogDescription>
              系统纸张对所有用户可见可用（用户只读，不能修改），用于统一公司/团队的标准纸张
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-paper-name">
                纸张名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="admin-paper-name"
                value={newName}
                autoFocus
                maxLength={PAPER_NAME_MAX_LENGTH}
                placeholder={`必填，最多 ${PAPER_NAME_MAX_LENGTH} 个字符`}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="admin-paper-width" className="text-xs text-muted-foreground">宽 (mm)</Label>
                <Input
                  id="admin-paper-width"
                  type="number"
                  step="0.1"
                  value={newWidth}
                  onChange={(e) => setNewWidth(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="admin-paper-height" className="text-xs text-muted-foreground">高 (mm)</Label>
                <Input
                  id="admin-paper-height"
                  type="number"
                  step="0.1"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                />
              </div>
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除纸张「{pendingDelete?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复。已使用该纸张的模板不受影响，仍按保存时的尺寸打印。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === pendingDelete?.id}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busyId === pendingDelete?.id}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}