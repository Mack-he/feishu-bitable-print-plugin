'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { SubjectPicker } from '@/components/shared/SubjectPicker';
import type { TemplateGrantEntry } from '@/store/templateStore';

interface TemplateGrantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminToken: string;
  template: { id: number; name: string; visibility?: string } | null;
  onSaved?: () => void;
}

type Visibility = 'private' | 'public' | 'restricted';

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; description: string }> = [
  { value: 'private', label: '不可见', description: '除你（管理员）外的用户都看不到（创建者也看不到？仅管理员可见）' },
  { value: 'public', label: '所有用户', description: '所有登录用户都能查看和打印，但不能修改' },
  { value: 'restricted', label: '指定用户和部门', description: '只有名单内的用户/部门可以查看和打印' },
];

/**
 * 管理端授权配置：可见范围 + 授权名单（企业模板的主要配置入口）
 */
export function TemplateGrantsDialog({
  open,
  onOpenChange,
  adminToken,
  template,
  onSaved,
}: TemplateGrantsDialogProps) {
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [grants, setGrants] = useState<TemplateGrantEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !template) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    fetch(`/api/admin/templates/${template.id}/grants`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (!result.success) throw new Error(result.error || '获取授权名单失败');
        setVisibility((result.data.visibility as Visibility) || 'public');
        setGrants(
          (result.data.grants || []).map((grant: any) => ({
            subjectType: grant.subjectType,
            subjectId: grant.subjectId,
            includeSubDepartments: grant.includeSubDepartments,
            subjectName: grant.subjectName,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '获取授权名单失败');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, template?.id, adminToken]);

  const handleSave = async () => {
    if (!template) return;
    if (visibility === 'restricted' && grants.length === 0) {
      setError('选择「指定用户和部门」时，至少添加一个用户或部门');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}/grants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          visibility,
          grants: grants.map((entry) => ({
            subjectType: entry.subjectType,
            subjectId: entry.subjectId,
            includeSubDepartments: entry.includeSubDepartments !== false,
          })),
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '保存授权失败');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存授权失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>授权设置</DialogTitle>
          <DialogDescription>配置该模板的可见范围与授权名单（用户/部门）</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm">
            模板：<span className="font-medium">{template?.name}</span>
          </p>

          <div className="space-y-2">
            <Label>可见范围</Label>
            {VISIBILITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                  visibility === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="admin-template-visibility"
                  className="mt-1"
                  checked={visibility === option.value}
                  disabled={isLoading || isSaving}
                  onChange={() => setVisibility(option.value)}
                />
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          {visibility === 'restricted' && (
            <div className="rounded-lg border p-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <SubjectPicker value={grants} onChange={setGrants} disabled={isSaving} />
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}