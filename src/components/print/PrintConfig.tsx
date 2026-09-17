'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  PRESET_TEMPLATES, 
  PrintTemplate, 
  PrintFieldMapping, 
  PrintConfig 
} from '@/types/print-config';
import { 
  FileText, 
  Layout, 
  Settings2, 
  Palette,
  Eye,
  Download,
  Printer as PrinterIcon,
  GripVertical
} from 'lucide-react';

interface PrintConfigPanelProps {
  fields: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  totalRecords: number;
  selectedRecords: string[];
  onConfigChange: (config: PrintConfig) => void;
  onPreview: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
}

export function PrintConfigPanel({
  fields,
  totalRecords,
  selectedRecords,
  onConfigChange,
  onPreview,
  onPrint,
  onExportPDF
}: PrintConfigPanelProps) {
  const [activeTab, setActiveTab] = useState('template');
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate>(PRESET_TEMPLATES[0]);
  const [fieldMappings, setFieldMappings] = useState<PrintFieldMapping[]>([]);
  const [options, setOptions] = useState<PrintConfig['options']>({
    includeQRCode: false,
    includeBarcode: false,
    barcodeFormat: 'CODE128',
    generateIndex: true,
    indexPrefix: 'NO.'
  });

  // 初始化字段映射
  useEffect(() => {
    const mappings: PrintFieldMapping[] = fields.map((field, index) => ({
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.type,
      displayName: field.name,
      include: index < 5, // 默认包含前 5 个字段
      order: index
    }));
    setFieldMappings(mappings);
  }, [fields]);

  // 更新配置
  useEffect(() => {
    onConfigChange({
      template: { ...selectedTemplate, fieldMappings },
      selectedRecords,
      options
    });
  }, [selectedTemplate, fieldMappings, options, selectedRecords, onConfigChange]);

  // 切换字段包含状态
  const toggleFieldInclude = (fieldId: string) => {
    setFieldMappings(prev => 
      prev.map(m => 
        m.fieldId === fieldId ? { ...m, include: !m.include } : m
      )
    );
  };

  // 更新字段显示名称
  const updateFieldDisplayName = (fieldId: string, displayName: string) => {
    setFieldMappings(prev =>
      prev.map(m =>
        m.fieldId === fieldId ? { ...m, displayName } : m
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">打印配置</h2>
          <p className="text-sm text-muted-foreground">
            已选择 {selectedRecords.length} / {totalRecords} 条记录
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onPreview}>
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button size="sm" variant="outline" onClick={onExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            导出PDF
          </Button>
          <Button size="sm" onClick={onPrint}>
            <PrinterIcon className="w-4 h-4 mr-2" />
            打印
          </Button>
        </div>
      </div>

      {/* 配置面板 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-4 mb-0">
          <TabsTrigger value="template" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            模板
          </TabsTrigger>
          <TabsTrigger value="fields" className="text-xs">
            <Layout className="w-3 h-3 mr-1" />
            字段
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            <Settings2 className="w-3 h-3 mr-1" />
            布局
          </TabsTrigger>
          <TabsTrigger value="options" className="text-xs">
            <Palette className="w-3 h-3 mr-1" />
            选项
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-4">
          {/* 模板选择 */}
          <TabsContent value="template" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              {PRESET_TEMPLATES.map(template => (
                <Card 
                  key={template.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedTemplate.id === template.id 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    {selectedTemplate.id === template.id && (
                      <Badge variant="default" className="text-xs">当前</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {template.layout.columns} 列
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.layout.paperSize}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 字段映射 */}
          <TabsContent value="fields" className="mt-0">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                选择要打印的字段，并可以自定义显示名称
              </p>
              {fieldMappings.map((mapping) => (
                <div 
                  key={mapping.fieldId}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <Checkbox
                    checked={mapping.include}
                    onCheckedChange={() => toggleFieldInclude(mapping.fieldId)}
                  />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">字段名</Label>
                      <p className="text-sm font-medium">{mapping.fieldName}</p>
                    </div>
                    <Input
                      value={mapping.displayName || ''}
                      onChange={(e) => updateFieldDisplayName(mapping.fieldId, e.target.value)}
                      placeholder="显示名称"
                      className="h-8"
                      disabled={!mapping.include}
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {mapping.fieldType}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 布局设置 */}
          <TabsContent value="layout" className="mt-0">
            <div className="space-y-6">
              <div>
                <Label>每行卡片数</Label>
                <Select
                  value={String(selectedTemplate.layout.columns)}
                  onValueChange={(value) => 
                    setSelectedTemplate(prev => ({
                      ...prev,
                      layout: { ...prev.layout, columns: Number(value) }
                    }))
                  }
                >
                  <option value="1">1 列</option>
                  <option value="2">2 列</option>
                  <option value="3">3 列</option>
                  <option value="4">4 列</option>
                </Select>
              </div>

              <div>
                <Label>纸张大小</Label>
                <Select
                  value={selectedTemplate.layout.paperSize}
                  onValueChange={(value) =>
                    setSelectedTemplate(prev => ({
                      ...prev,
                      layout: { ...prev.layout, paperSize: value as any }
                    }))
                  }
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </Select>
              </div>

              <div>
                <Label>页面方向</Label>
                <Select
                  value={selectedTemplate.layout.orientation}
                  onValueChange={(value) =>
                    setSelectedTemplate(prev => ({
                      ...prev,
                      layout: { ...prev.layout, orientation: value as any }
                    }))
                  }
                >
                  <option value="portrait">纵向</option>
                  <option value="landscape">横向</option>
                </Select>
              </div>

              <Separator />

              <div>
                <Label>字体大小</Label>
                <Select
                  value={String(selectedTemplate.style.fontSize)}
                  onValueChange={(value) =>
                    setSelectedTemplate(prev => ({
                      ...prev,
                      style: { ...prev.style, fontSize: Number(value) }
                    }))
                  }
                >
                  <option value="9">9pt</option>
                  <option value="10">10pt</option>
                  <option value="11">11pt</option>
                  <option value="12">12pt</option>
                  <option value="14">14pt</option>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedTemplate.style.showBorder}
                  onCheckedChange={(checked) =>
                    setSelectedTemplate(prev => ({
                      ...prev,
                      style: { ...prev.style, showBorder: checked as boolean }
                    }))
                  }
                  id="showBorder"
                />
                <Label htmlFor="showBorder" className="text-sm font-normal">
                  显示边框
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedTemplate.style.showHeader}
                  onCheckedChange={(checked) =>
                    setSelectedTemplate(prev => ({
                      ...prev,
                      style: { ...prev.style, showHeader: checked as boolean }
                    }))
                  }
                  id="showHeader"
                />
                <Label htmlFor="showHeader" className="text-sm font-normal">
                  显示页眉
                </Label>
              </div>

              {selectedTemplate.style.showHeader && (
                <div>
                  <Label>页眉文本</Label>
                  <Input
                    value={selectedTemplate.style.headerText || ''}
                    onChange={(e) =>
                      setSelectedTemplate(prev => ({
                        ...prev,
                        style: { ...prev.style, headerText: e.target.value }
                      }))
                    }
                    placeholder="页眉内容"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* 高级选项 */}
          <TabsContent value="options" className="mt-0">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">二维码选项</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={options.includeQRCode}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, includeQRCode: checked as boolean }))
                    }
                    id="includeQRCode"
                  />
                  <Label htmlFor="includeQRCode" className="text-sm font-normal">
                    为每条记录生成二维码
                  </Label>
                </div>
                {options.includeQRCode && (
                  <div>
                    <Label>二维码内容字段</Label>
                    <Select
                      value={options.qrCodeField}
                      onValueChange={(value) =>
                        setOptions(prev => ({ ...prev, qrCodeField: value }))
                      }
                    >
                      <option value="">选择字段</option>
                      {fields.map(field => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">条形码选项</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={options.includeBarcode}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, includeBarcode: checked as boolean }))
                    }
                    id="includeBarcode"
                  />
                  <Label htmlFor="includeBarcode" className="text-sm font-normal">
                    为每条记录生成条形码
                  </Label>
                </div>
                {options.includeBarcode && (
                  <>
                    <div>
                      <Label>条形码内容字段</Label>
                      <Select
                        value={options.barcodeField}
                        onValueChange={(value) =>
                          setOptions(prev => ({ ...prev, barcodeField: value }))
                        }
                      >
                        <option value="">选择字段</option>
                        {fields.map(field => (
                          <option key={field.id} value={field.id}>{field.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>条形码格式</Label>
                      <Select
                        value={options.barcodeFormat}
                        onValueChange={(value) =>
                          setOptions(prev => ({ ...prev, barcodeFormat: value as any }))
                        }
                      >
                        <option value="CODE128">CODE128</option>
                        <option value="CODE39">CODE39</option>
                        <option value="EAN13">EAN13</option>
                        <option value="UPC">UPC</option>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">编号选项</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={options.generateIndex}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, generateIndex: checked as boolean }))
                    }
                    id="generateIndex"
                  />
                  <Label htmlFor="generateIndex" className="text-sm font-normal">
                    自动生成序号
                  </Label>
                </div>
                {options.generateIndex && (
                  <div>
                    <Label>序号前缀</Label>
                    <Input
                      value={options.indexPrefix || ''}
                      onChange={(e) =>
                        setOptions(prev => ({ ...prev, indexPrefix: e.target.value }))
                      }
                      placeholder="例如：NO."
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
