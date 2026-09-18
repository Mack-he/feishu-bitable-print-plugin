'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/store/editorStore';
import { usePaperPresetStore, PaperPreset } from '@/store/paperPresetStore';
import { PageConfig } from '@/types/editor';
import {
  BUILT_IN_PAPERS,
  PAPER_MAX_MM,
  PAPER_MIN_MM,
  PAPER_NAME_MAX_LENGTH,
  isValidPaperMm,
  normalizePaperDims,
  resolvePaper,
  validatePaperName,
} from '@/lib/paper';
import { PaperPresetManagerDialog } from './PaperPresetManagerDialog';
import { Loader2, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface PageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageConfig?: PageConfig;
  onPageConfigChange?: (config: PageConfig) => void;
}

/** 纸张下拉里"新建自定义"的哨兵值 */
const NEW_CUSTOM_VALUE = '__new_custom__';

const PAPER_GROUPS = ['A 系列', 'B 系列', '国内开本', '北美标准'] as const;

export function PageSettingsDialog({
  open,
  onOpenChange,
  pageConfig: propPageConfig,
  onPageConfigChange
}: PageSettingsDialogProps) {
  const editorStore = useEditorStore();
  const pageConfig = propPageConfig || editorStore.pageConfig;

  const presets = usePaperPresetStore((state) => state.presets);
  const createPreset = usePaperPresetStore((state) => state.createPreset);
  const updatePreset = usePaperPresetStore((state) => state.updatePreset);

  const [localConfig, setLocalConfig] = useState<PageConfig>(pageConfig);
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [syncPreset, setSyncPreset] = useState(true);

  /** 新建自定义纸张的内联表单 */
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [isCreatingSaving, setIsCreatingSaving] = useState(false);

  // 仅在打开弹窗时同步外部配置，避免编辑过程中被 store 更新打断
  React.useEffect(() => {
    if (!open) return;
    setLocalConfig(pageConfig);
    setIsCreating(false);
    setFormError(null);
    setSyncPreset(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 尺寸输入框跟随当前纸张（自定义纸张可编辑，内置纸张只读展示）
  const resolved = resolvePaper(localConfig, presets);
  React.useEffect(() => {
    if (localConfig.size === 'Custom') {
      setWidthInput(String(localConfig.customWidth ?? resolved.baseWidth));
      setHeightInput(String(localConfig.customHeight ?? resolved.baseHeight));
    } else {
      setWidthInput(String(resolved.baseWidth));
      setHeightInput(String(resolved.baseHeight));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localConfig.size, localConfig.customWidth, localConfig.customHeight, resolved.baseWidth, resolved.baseHeight]);

  const isCustom = localConfig.size === 'Custom';
  const myPresets = presets.filter((preset) => preset.isOwner);
  const activePresets = presets.filter((preset) => preset.status === 'active');
  const systemPresets = activePresets.filter((preset) => preset.isSystem);
  const myActivePresets = activePresets.filter((preset) => preset.isOwner && !preset.isSystem);
  const sharedPresets = activePresets.filter((preset) => !preset.isOwner && !preset.isSystem);

  const selectedPreset: PaperPreset | undefined =
    isCustom && localConfig.paperPresetId !== undefined
      ? presets.find((preset) => preset.id === localConfig.paperPresetId)
      : undefined;

  // 他人共享/系统纸张不能改尺寸：改了也无法回写预设，保存后下次打开会被预设尺寸覆盖，容易造成误解
  const canEditSize = isCustom && (!selectedPreset || selectedPreset.isOwner);

  const parsedWidth = Number(widthInput);
  const parsedHeight = Number(heightInput);
  const dimsValid = isValidPaperMm(parsedWidth) && isValidPaperMm(parsedHeight);
  const swapped = dimsValid && parsedWidth > parsedHeight;
  const normalizedDims = dimsValid ? normalizePaperDims(parsedWidth, parsedHeight) : null;
  const dimsChanged =
    !!selectedPreset &&
    !!normalizedDims &&
    (normalizedDims.width !== selectedPreset.widthMm || normalizedDims.height !== selectedPreset.heightMm);

  const handleSelectPaper = (value: string) => {
    setFormError(null);

    if (value === NEW_CUSTOM_VALUE) {
      setIsCreating(true);
      setNewName('');
      setNewWidth(String(resolved.baseWidth));
      setNewHeight(String(resolved.baseHeight));
      setNewIsPublic(false);
      return;
    }

    setIsCreating(false);

    const preset = presets.find((item) => `preset:${item.id}` === value);
    if (preset) {
      setLocalConfig((prev) => ({
        ...prev,
        size: 'Custom',
        paperPresetId: preset.id,
        paperName: preset.name,
        customWidth: preset.widthMm,
        customHeight: preset.heightMm,
      }));
      return;
    }

    setLocalConfig((prev) => ({
      ...prev,
      size: value as PageConfig['size'],
      paperPresetId: undefined,
      paperName: undefined,
      customWidth: undefined,
      customHeight: undefined,
    }));
  };

  const selectValue = isCustom
    ? localConfig.paperPresetId !== undefined
      ? `preset:${localConfig.paperPresetId}`
      : ''
    : localConfig.size;

  const handleCreatePreset = async () => {
    setFormError(null);

    const nameError = validatePaperName(newName, myPresets.map((preset) => preset.name));
    if (nameError) {
      setFormError(nameError);
      return;
    }

    const width = Number(newWidth);
    const height = Number(newHeight);
    if (!isValidPaperMm(width) || !isValidPaperMm(height)) {
      setFormError(`尺寸需在 ${PAPER_MIN_MM}~${PAPER_MAX_MM} mm 之间`);
      return;
    }

    const normalized = normalizePaperDims(width, height);

    setIsCreatingSaving(true);
    try {
      const preset = await createPreset({
        name: newName.trim(),
        widthMm: normalized.width,
        heightMm: normalized.height,
        isPublic: newIsPublic,
      });

      setLocalConfig((prev) => ({
        ...prev,
        size: 'Custom',
        paperPresetId: preset.id,
        paperName: preset.name,
        customWidth: preset.widthMm,
        customHeight: preset.heightMm,
      }));
      setIsCreating(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存纸张失败');
    } finally {
      setIsCreatingSaving(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);

    if (isCustom) {
      if (!dimsValid) {
        setFormError(`尺寸需在 ${PAPER_MIN_MM}~${PAPER_MAX_MM} mm 之间`);
        return;
      }
      if (!normalizedDims) return;
    }

    const nextConfig: PageConfig = isCustom && normalizedDims
      ? {
          ...localConfig,
          customWidth: normalizedDims.width,
          customHeight: normalizedDims.height,
        }
      : {
          ...localConfig,
          customWidth: undefined,
          customHeight: undefined,
          paperPresetId: undefined,
          paperName: undefined,
        };

    setIsSaving(true);
    try {
      // 尺寸有改动且勾选了「同时更新」，回写纸张预设
      if (dimsChanged && syncPreset && selectedPreset) {
        await updatePreset(selectedPreset.id, {
          widthMm: normalizedDims!.width,
          heightMm: normalizedDims!.height,
        });
      }

      if (onPageConfigChange) {
        onPageConfigChange(nextConfig);
      } else {
        editorStore.setPageConfig(nextConfig);
      }
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>页面设置</DialogTitle>
            <DialogDescription>
              设置打印页面的尺寸、方向和边距
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 纸张规格 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>纸张规格</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  onClick={() => setShowManager(true)}
                >
                  <Settings2 className="w-3 h-3" />
                  管理我的纸张
                </button>
              </div>
              <div className="flex gap-2">
                <Select value={selectValue} onValueChange={handleSelectPaper}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择纸张" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_GROUPS.map((group) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {BUILT_IN_PAPERS.filter((paper) => paper.group === group).map((paper) => (
                          <SelectItem key={paper.key} value={paper.key}>
                            {paper.label}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {paper.width}×{paper.height}mm
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}

                    {systemPresets.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>系统纸张</SelectLabel>
                        {systemPresets.map((preset) => (
                          <SelectItem key={preset.id} value={`preset:${preset.id}`}>
                            {preset.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {preset.widthMm}×{preset.heightMm}mm · 管理员维护
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {myActivePresets.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>我的自定义</SelectLabel>
                        {myActivePresets.map((preset) => (
                          <SelectItem key={preset.id} value={`preset:${preset.id}`}>
                            {preset.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {preset.widthMm}×{preset.heightMm}mm
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {sharedPresets.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>共享给我</SelectLabel>
                        {sharedPresets.map((preset) => (
                          <SelectItem key={preset.id} value={`preset:${preset.id}`}>
                            {preset.name}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {preset.widthMm}×{preset.heightMm}mm · {preset.ownerName || '他人共享'}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    <SelectGroup>
                      <SelectItem value={NEW_CUSTOM_VALUE}>
                        <span className="inline-flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          新建自定义纸张…
                        </span>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={localConfig.orientation === 'portrait' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setLocalConfig({ ...localConfig, orientation: 'portrait' })}
                  >
                    纵向
                  </Button>
                  <Button
                    variant={localConfig.orientation === 'landscape' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setLocalConfig({ ...localConfig, orientation: 'landscape' })}
                  >
                    横向
                  </Button>
                </div>
              </div>

              {isCustom && selectedPreset && selectedPreset.isSystem && (
                <p className="text-xs text-muted-foreground">
                  系统纸张由管理员统一维护，可直接使用，不能修改
                </p>
              )}
              {isCustom && selectedPreset && !selectedPreset.isOwner && !selectedPreset.isSystem && (
                <p className="text-xs text-muted-foreground">
                  共享纸张由 {selectedPreset.ownerName || '他人'} 创建，可直接使用，不能修改
                </p>
              )}
              {isCustom && selectedPreset && selectedPreset.status !== 'active' && (
                <p className="text-xs text-amber-600">
                  该纸张已被管理员停用，当前模板仍按保存时的尺寸打印
                </p>
              )}
              {isCustom && !selectedPreset && localConfig.paperName && (
                <p className="text-xs text-amber-600">
                  纸张「{localConfig.paperName}」已不存在，当前模板仍按保存时的尺寸打印
                </p>
              )}
            </div>

            {/* 新建自定义纸张 */}
            {isCreating && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="paper-name">
                    纸张名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="paper-name"
                    value={newName}
                    autoFocus
                    maxLength={PAPER_NAME_MAX_LENGTH}
                    placeholder={`必填，最多 ${PAPER_NAME_MAX_LENGTH} 个字符`}
                    onChange={(event) => setNewName(event.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="paper-width" className="text-xs text-muted-foreground">宽 (mm)</Label>
                    <Input
                      id="paper-width"
                      type="number"
                      value={newWidth}
                      step="0.1"
                      onChange={(event) => setNewWidth(event.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="paper-height" className="text-xs text-muted-foreground">高 (mm)</Label>
                    <Input
                      id="paper-height"
                      type="number"
                      value={newHeight}
                      step="0.1"
                      onChange={(event) => setNewHeight(event.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="paper-public"
                    checked={newIsPublic}
                    onCheckedChange={(checked) => setNewIsPublic(checked as boolean)}
                  />
                  <Label htmlFor="paper-public" className="text-xs cursor-pointer">
                    公开给所有用户（他人可见可用，不能修改）
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} disabled={isCreatingSaving}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreatePreset}
                    disabled={!newName.trim() || isCreatingSaving}
                  >
                    {isCreatingSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    保存纸张
                  </Button>
                </div>
              </div>
            )}

            {/* 尺寸 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>尺寸 (mm)</Label>
                {isCustom && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedPreset ? (selectedPreset.isOwner ? '我的自定义' : '共享纸张') : '自定义'}
                  </Badge>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">宽</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={widthInput}
                      disabled={!canEditSize}
                      onChange={(event) => setWidthInput(event.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">高</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={heightInput}
                      disabled={!canEditSize}
                      onChange={(event) => setHeightInput(event.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
              {!isCustom && (
                <p className="text-xs text-muted-foreground">
                  内置纸张尺寸固定，需要自定义尺寸请选择「新建自定义纸张…」
                </p>
              )}
              {isCustom && !canEditSize && (
                <p className="text-xs text-muted-foreground">
                  该纸张由管理员/他人维护，尺寸固定；需要其他尺寸请选择「新建自定义纸张…」
                </p>
              )}
              {isCustom && swapped && (
                <p className="text-xs text-amber-600">
                  宽大于高，将按纵向基准保存为 {normalizedDims?.width}×{normalizedDims?.height}mm；横向请切换方向
                </p>
              )}
              {isCustom && !dimsValid && (widthInput !== '' || heightInput !== '') && (
                <p className="text-xs text-destructive">
                  尺寸需在 {PAPER_MIN_MM}~{PAPER_MAX_MM} mm 之间
                </p>
              )}
            </div>

            {/* 尺寸回写预设 */}
            {isCustom && dimsChanged && selectedPreset?.isOwner && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sync-preset"
                  checked={syncPreset}
                  onCheckedChange={(checked) => setSyncPreset(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="sync-preset" className="cursor-pointer">
                    同时更新纸张「{selectedPreset.name}」的尺寸
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    不勾选则只对当前模板生效，纸张预设保持原尺寸
                  </p>
                </div>
              </div>
            )}

            {/* 页边距 */}
            <div className="space-y-2">
              <Label>页边距 (mm)</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">上</Label>
                  <Input
                    type="number"
                    value={localConfig.margins.top}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      margins: { ...localConfig.margins, top: Number(e.target.value) }
                    })}
                    className="h-9"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">下</Label>
                  <Input
                    type="number"
                    value={localConfig.margins.bottom}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      margins: { ...localConfig.margins, bottom: Number(e.target.value) }
                    })}
                    className="h-9"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">左</Label>
                  <Input
                    type="number"
                    value={localConfig.margins.left}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      margins: { ...localConfig.margins, left: Number(e.target.value) }
                    })}
                    className="h-9"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">右</Label>
                  <Input
                    type="number"
                    value={localConfig.margins.right}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      margins: { ...localConfig.margins, right: Number(e.target.value) }
                    })}
                    className="h-9"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* 连续页面 */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="continuous"
                checked={localConfig.continuous}
                onCheckedChange={(checked) => setLocalConfig({ ...localConfig, continuous: checked as boolean })}
              />
              <div className="space-y-1">
                <Label htmlFor="continuous" className="cursor-pointer">
                  连续页面
                </Label>
                <p className="text-xs text-muted-foreground">
                  生成单一页面文档（无分页），页面高度随内容变化；仅对点击打印按钮生效
                </p>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-destructive">{formError}</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (isCustom && !dimsValid)}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              确定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaperPresetManagerDialog open={showManager} onOpenChange={setShowManager} />
    </>
  );
}