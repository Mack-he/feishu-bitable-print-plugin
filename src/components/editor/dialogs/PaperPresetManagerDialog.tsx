'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePaperPresetStore, PaperPreset } from '@/store/paperPresetStore';
import {
  PAPER_MAX_MM,
  PAPER_MIN_MM,
  PAPER_NAME_MAX_LENGTH,
  isValidPaperMm,
  normalizePaperDims,
  validatePaperName,
} from '@/lib/paper';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

interface PaperPresetManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditState {
  id: number;
  name: string;
  width: string;
  height: string;
  isPublic: boolean;
}

/**
 * 我的纸张管理：改名 / 改尺寸 / 公开 / 删除
 * 只能管理自己创建的纸张；他人共享的纸张在页面设置里可见可用但不能改
 */
export function PaperPresetManagerDialog({ open, onOpenChange }: PaperPresetManagerDialogProps) {
  const presets = usePaperPresetStore((state) => state.presets);
  const updatePreset = usePaperPresetStore((state) => state.updatePreset);
  const deletePreset = usePaperPresetStore((state) => state.deletePreset);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PaperPreset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const myPresets = presets.filter((preset) => preset.isOwner);

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setError(null);
      setPendingDelete(null);
    }
  }, [open]);

  const startEdit = (preset: PaperPreset) => {
    setError(null);
    setEditing({
      id: preset.id,
      name: preset.name,
      width: String(preset.widthMm),
      height: String(preset.heightMm),
      isPublic: preset.isPublic,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setError(null);

    const nameError = validatePaperName(
      editing.name,
      myPresets.filter((preset) => preset.id !== editing.id).map((preset) => preset.name)
    );
    if (nameError) {
      setError(nameError);
      return;
    }

    const width = Number(editing.width);
    const height = Number(editing.height);
    if (!isValidPaperMm(width) || !isValidPaperMm(height)) {
      setError(`尺寸需在 ${PAPER_MIN_MM}~${PAPER_MAX_MM} mm 之间`);
      return;
    }

    const normalized = normalizePaperDims(width, height);

    setIsSaving(true);
    try {
      await updatePreset(editing.id, {
        name: editing.name.trim(),
        widthMm: normalized.width,
        heightMm: normalized.height,
        isPublic: editing.isPublic,
      });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deletePreset(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>我的纸张</DialogTitle>
            <DialogDescription>
              自定义纸张默认只有你自己可用；设为公开后其他用户可见可用，但不能修改
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            {myPresets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                还没有自定义纸张，在「纸张规格」里选择「新建自定义纸张…」即可创建
              </p>
            ) : (
              <div className="space-y-2 pr-3">
                {myPresets.map((preset) => {
                  const isEditing = editing?.id === preset.id;

                  return (
                    <div key={preset.id} className="rounded-lg border p-3">
                      {isEditing && editing ? (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">名称</Label>
                              <Input
                                value={editing.name}
                                maxLength={PAPER_NAME_MAX_LENGTH}
                                autoFocus
                                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                className="h-8"
                              />
                            </div>
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">宽 (mm)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={editing.width}
                                onChange={(e) => setEditing({ ...editing, width: e.target.value })}
                                className="h-8"
                              />
                            </div>
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">高 (mm)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={editing.height}
                                onChange={(e) => setEditing({ ...editing, height: e.target.value })}
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`public-${preset.id}`}
                              checked={editing.isPublic}
                              onCheckedChange={(checked) => setEditing({ ...editing, isPublic: checked as boolean })}
                            />
                            <Label htmlFor={`public-${preset.id}`} className="text-xs cursor-pointer">
                              公开给所有用户
                            </Label>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={isSaving}>
                              取消
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={!editing.name.trim() || isSaving}>
                              {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                              保存
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{preset.name}</span>
                              {preset.isPublic && <Badge variant="secondary" className="text-xs">公开</Badge>}
                              {preset.status !== 'active' && (
                                <Badge variant="destructive" className="text-xs">已停用</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {preset.widthMm}×{preset.heightMm} mm
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(preset)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(preset)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除纸张「{pendingDelete?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复。已经使用该纸张的模板不受影响，仍按保存时的尺寸打印。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}