'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useEditorStore } from '@/store/editorStore';

export function SettingsPanel() {
  const { styleConfig, setStyleConfig } = useEditorStore();

  return (
    <div className="p-3 space-y-4">
      {/* 标题 */}
      <div>
        <h3 className="font-medium text-sm">设置</h3>
        <p className="text-xs text-muted-foreground mt-1">
          全局样式配置
        </p>
      </div>

      {/* 样式设置 */}
      <div className="space-y-4">
        {/* 默认字体大小 */}
        <div className="space-y-2">
          <Label className="text-xs">默认字体大小 (pt)</Label>
          <Select
            value={styleConfig.fontSize.toString()}
            onValueChange={(value) => setStyleConfig({ fontSize: Number(value) })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 默认行高 */}
        <div className="space-y-2">
          <Label className="text-xs">默认行高</Label>
          <Select
            value={styleConfig.lineHeight.toString()}
            onValueChange={(value) => setStyleConfig({ lineHeight: Number(value) })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.5, 3].map((height) => (
                <SelectItem key={height} value={height.toString()}>
                  {height}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 默认段后间距 */}
        <div className="space-y-2">
          <Label className="text-xs">默认段后间距 (pt)</Label>
          <Select
            value={styleConfig.paragraphSpacing.toString()}
            onValueChange={(value) => setStyleConfig({ paragraphSpacing: Number(value) })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40].map((spacing) => (
                <SelectItem key={spacing} value={spacing.toString()}>
                  {spacing}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 字体 */}
        <div className="space-y-2">
          <Label className="text-xs">字体</Label>
          <Select
            value={styleConfig.fontFamily}
            onValueChange={(value) => setStyleConfig({ fontFamily: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PingFang SC, Microsoft YaHei, sans-serif">
                苹方 / 微软雅黑
              </SelectItem>
              <SelectItem value="SimSun, serif">宋体</SelectItem>
              <SelectItem value="SimHei, sans-serif">黑体</SelectItem>
              <SelectItem value="KaiTi, serif">楷体</SelectItem>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 说明 */}
      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          以上设置将应用于所有文本组件的默认样式。可以在单个组件上单独调整。
        </p>
      </div>
    </div>
  );
}
