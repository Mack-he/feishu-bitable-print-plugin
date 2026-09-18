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
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SubjectPicker } from '@/components/shared/SubjectPicker';
import { useTemplateStore, Template, TemplateGrantEntry } from '@/store/templateStore';

interface ShareSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSaved?: (visibility: string) => void;
}

type Visibility = 'private' | 'public' | 'restricted';

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; description: string }> = [
  { value: 'private', label: '仅自己', description: '只有你能看到和使用' },
  { value: 'public', label: '所有用户', description: '所有登录用户都能查看和打印（不能修改）' },
  { value: 'restricted', label: '指定用户和部门', description: '只有名单内的用户/部门可以查看和打印' },
];

/**
 * 模板共享设置：可见范围 + 授权名单
 * 只读权限模型：被授权用户可用（查看/打印/复制），但不能修改原模板
 */
export function ShareSettingsDialog({ open, onOpenChange, template, onSaved }: ShareSettingsDialogProps) {
  const fetchGrants = useTemplateStore((state) => state.fetchGrants);
  const updateGrants = useTemplateStore((state) => state.updateGrants);

  const [visibility, setVisibility] = useState<Visibility>('private');
  const [grants, setGrants] = useState<TemplateGrantEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !template) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    fetchGrants(template.id)
      .then((data) => {
        if (cancelled) return;
        setVisibility((data.visibility as Visibility) || 'private');
        setGrants(data.grants || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '获取共享设置失败');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const handleSave = async () => {
    if (!template) return;

    if (visibility === 'restricted' && grants.length === 0) {
      setError('选择「指定用户和部门」时，至少添加一个用户或部门');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        visibility,
        grants: grants.map((entry) => ({
          subjectType: entry.subjectType,
          subjectId: entry.subjectId,
          includeSubDepartments: entry.includeSubDepartments !== false,
        })),
      };
      await updateGrants(template.id, payload);
      onSaved?.(visibility);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存共享设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>共享设置</DialogTitle>
          <DialogDescription>
            被授权的用户和部门可以查看、打印该模板，但不能修改；需要修改可「复制为我的模板」
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{template?.name}</span>
            {template?.publishRequestStatus === 'pending' && (
              <Badge variant="secondary" className="text-xs">发布申请审核中</Badge>
            )}
          </div>

          {/* 可见范围 */}
          <div className="space-y-2">
            <Label>可见范围</Label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    visibility === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template-visibility"
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
          </div>

          {/* 授权名单 */}
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