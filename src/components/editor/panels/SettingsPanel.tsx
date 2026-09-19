'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEditorStore } from '@/store/editorStore';
import {
  BARCODE_FORMATS,
  BARCODE_BAR_WIDTH_OPTIONS,
  BARCODE_HEIGHT_OPTIONS,
  DEFAULT_BARCODE_BAR_WIDTH,
  DEFAULT_BARCODE_HEIGHT,
  DEFAULT_QR_SIZE,
  QR_SIZE_OPTIONS,
} from '@/components/editor/canvas/CodeViews';

export function SettingsPanel() {
  const { styleConfig, setStyleConfig, selectedComponentId, components, updateComponent } = useEditorStore();

  // 选中组件后，按其类型显示对应的专属设置
  const selectedComponent = components.find((component) => component.id === selectedComponentId);
  const checkboxComponent = selectedComponent?.type === 'checkbox' ? selectedComponent : null;
  const qrcodeComponent = selectedComponent?.type === 'qrcode' ? selectedComponent : null;
  const barcodeComponent = selectedComponent?.type === 'barcode' ? selectedComponent : null;
  const hasComponentSection = Boolean(checkboxComponent || qrcodeComponent || barcodeComponent);

  return (
    <div className="p-3 space-y-4">
      {/* 标题 */}
      <div>
        <h3 className="font-medium text-sm">设置</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {hasComponentSection ? '选中组件的设置' : '全局样式配置'}
        </p>
      </div>

      {/* 二维码设置（选中二维码时显示，放在最前，避免被全局样式挤到下面） */}
      {qrcodeComponent && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">二维码设置</h4>
            <p className="text-xs text-muted-foreground mt-1">
              内容支持变量，如 [物料编码]，打印时替换为当前记录的值
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">内容</Label>
            <Input
              value={qrcodeComponent.content ?? ''}
              placeholder="https://example.com 或 [字段名]"
              onChange={(e) => updateComponent(qrcodeComponent.id, { content: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              可从「数据源」面板点击字段复制变量后粘贴
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">尺寸 (px)</Label>
            <Select
              value={String(qrcodeComponent.size ?? DEFAULT_QR_SIZE)}
              onValueChange={(value) => updateComponent(qrcodeComponent.id, { size: Number(value) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QR_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} × {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 条形码设置（选中条形码时显示） */}
      {barcodeComponent && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">条形码设置</h4>
            <p className="text-xs text-muted-foreground mt-1">
              内容支持变量，如 [物料编码]，打印时替换为当前记录的值
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">内容</Label>
            <Input
              value={barcodeComponent.content ?? ''}
              placeholder="123456789 或 [字段名]"
              onChange={(e) => updateComponent(barcodeComponent.id, { content: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">格式</Label>
            <Select
              value={barcodeComponent.format || 'CODE128'}
              onValueChange={(value) => updateComponent(barcodeComponent.id, { format: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BARCODE_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              EAN13 / UPC 对内容长度和字符有要求，字段内容不合适时条码会显示生成失败
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">条宽 (px)</Label>
            <Select
              value={String(barcodeComponent.barWidth ?? DEFAULT_BARCODE_BAR_WIDTH)}
              onValueChange={(value) => updateComponent(barcodeComponent.id, { barWidth: Number(value) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BARCODE_BAR_WIDTH_OPTIONS.map((width) => (
                  <SelectItem key={width} value={width.toString()}>
                    {width}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">高度 (px)</Label>
            <Select
              value={String(barcodeComponent.height ?? DEFAULT_BARCODE_HEIGHT)}
              onValueChange={(value) => updateComponent(barcodeComponent.id, { height: Number(value) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BARCODE_HEIGHT_OPTIONS.map((height) => (
                  <SelectItem key={height} value={height.toString()}>
                    {height}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">显示内容数字</Label>
            <Switch
              checked={barcodeComponent.displayValue !== false}
              onCheckedChange={(checked) => updateComponent(barcodeComponent.id, { displayValue: checked })}
            />
          </div>
        </div>
      )}

      {/* 复选框设置（选中复选框时显示） */}
      {checkboxComponent && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">复选框设置</h4>
            <p className="text-xs text-muted-foreground mt-1">方格保持正方形等比缩放</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">方格大小 (px)</Label>
            <Select
              value={String(checkboxComponent.size ?? 24)}
              onValueChange={(value) => updateComponent(checkboxComponent.id, { size: Number(value) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[12, 16, 20, 24, 28, 32, 40, 48, 60].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} × {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">勾选状态</Label>
            <Switch
              checked={Boolean(checkboxComponent.checked)}
              onCheckedChange={(checked) => updateComponent(checkboxComponent.id, { checked })}
            />
          </div>
        </div>
      )}

      {/* 全局样式 */}
      <div className={hasComponentSection ? 'pt-3 border-t space-y-4' : 'space-y-4'}>
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

        <p className="text-xs text-muted-foreground">
          以上设置将应用于所有文本组件的默认样式。可以在单个组件上单独调整。
        </p>
      </div>
    </div>
  );
}
