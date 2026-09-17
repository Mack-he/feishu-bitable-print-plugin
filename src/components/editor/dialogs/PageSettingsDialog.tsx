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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, PageConfig } from '@/types/editor';
import { useState } from 'react';

interface PageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageConfig?: PageConfig;
  onPageConfigChange?: (config: PageConfig) => void;
}

export function PageSettingsDialog({ 
  open, 
  onOpenChange, 
  pageConfig: propPageConfig,
  onPageConfigChange 
}: PageSettingsDialogProps) {
  const editorStore = useEditorStore();
  const pageConfig = propPageConfig || editorStore.pageConfig;
  const [localConfig, setLocalConfig] = useState<PageConfig>(pageConfig);

  // 当外部配置变化时更新本地状态
  React.useEffect(() => {
    setLocalConfig(pageConfig);
  }, [pageConfig]);

  const handleSave = () => {
    if (onPageConfigChange) {
      onPageConfigChange(localConfig);
    } else {
      editorStore.setPageConfig(localConfig);
    }
    onOpenChange(false);
  };

  const pageSize = PAGE_SIZES[localConfig.size];

  return (
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
            <Label>纸张规格</Label>
            <div className="flex gap-2">
              <Select
                value={localConfig.size}
                onValueChange={(value) => setLocalConfig({ ...localConfig, size: value as PageConfig['size'] })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
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
          </div>

          {/* 尺寸显示 */}
          <div className="space-y-2">
            <Label>尺寸 (mm)</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">宽</Label>
                  <Input
                    value={localConfig.orientation === 'portrait' ? pageSize?.width : pageSize?.height}
                    disabled
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">高</Label>
                  <Input
                    value={localConfig.orientation === 'portrait' ? pageSize?.height : pageSize?.width}
                    disabled
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

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
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
