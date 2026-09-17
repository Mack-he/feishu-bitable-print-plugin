'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Info, FileImage } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AttachmentVariableConfig, AttachmentVariablePreview } from './AttachmentVariable';

interface InsertAttachmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: AttachmentVariableConfig) => void;
  availableFields: string[];  // 可用的附件字段列表
  initialField?: string;      // 初始选中的字段
  initialConfig?: AttachmentVariableConfig;  // 【新增】已有配置（用于编辑场景）
  previewData?: {             // 【新增】预览数据（实际附件数据）
    fieldName: string;
    attachments: {
      name: string;
      url?: string;
      token?: string;
      type?: string;
      size?: number;
    }[];
  } | null;
}

export function InsertAttachmentDialog({
  isOpen,
  onClose,
  onConfirm,
  availableFields,
  initialField,
  initialConfig,
  previewData
}: InsertAttachmentDialogProps) {
  // 表单状态
  const [selectedField, setSelectedField] = useState(initialField || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'image_only' | 'basic_info' | 'advanced'>('image_only');
  const [sizeMode, setSizeMode] = useState<'auto' | 'fixed_width' | 'fixed_height' | 'fixed_size'>('auto');
  const [width, setWidth] = useState<number>(120);
  const [height, setHeight] = useState<number>(120);
  const [onePerLine, setOnePerLine] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [emptyDisplay, setEmptyDisplay] = useState<'default' | 'custom'>('default');
  const [emptyCustomText, setEmptyCustomText] = useState('');

  // 过滤字段列表
  const filteredFields = availableFields.filter(field => 
    field.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 【新增】获取当前选中字段的预览数据
  const currentFieldPreviewData = React.useMemo(() => {
    if (!previewData || !selectedField) return null;
    
    // 如果 previewData 是当前选中字段的数据，直接返回
    if (previewData.fieldName === selectedField) {
      return previewData.attachments;
    }
    
    return null;
  }, [previewData, selectedField]);

  // 重置/初始化表单
  useEffect(() => {
    if (isOpen) {
      // 设置初始字段
      if (initialField) {
        setSelectedField(initialField);
      }
      
      // 如果有初始配置，使用初始配置初始化状态
      if (initialConfig) {
        setSizeMode(initialConfig.sizeMode || 'auto');
        setWidth(initialConfig.width || 120);
        setHeight(initialConfig.height || 120);
        setOnePerLine(initialConfig.onePerLine || false);
        setAlign(initialConfig.align || 'left');
        setEmptyDisplay(initialConfig.emptyDisplay || 'default');
        setEmptyCustomText(initialConfig.emptyCustomText || '');
        
        // 【重要】如果 displayMode 是 'advanced'，回退到 'image_only'（高级显示已禁用）
        const mode = initialConfig.displayMode || 'image_only';
        setDisplayMode(mode === 'advanced' ? 'image_only' : mode);
      } else {
        // 没有初始配置时，使用默认值
        setDisplayMode('image_only');
        setSizeMode('auto');
        setWidth(120);
        setHeight(120);
        setOnePerLine(false);
        setAlign('left');
        setEmptyDisplay('default');
        setEmptyCustomText('');
      }
    }
  }, [isOpen, initialField, initialConfig]);

  // 构建配置对象
  const buildConfig = (): AttachmentVariableConfig => ({
    fieldName: selectedField,
    displayMode,
    sizeMode,
    width: sizeMode === 'fixed_width' || sizeMode === 'fixed_size' ? width : undefined,
    height: sizeMode === 'fixed_height' || sizeMode === 'fixed_size' ? height : undefined,
    onePerLine,
    align,
    emptyDisplay,
    emptyCustomText: emptyDisplay === 'custom' ? emptyCustomText : undefined
  });

  const handleConfirm = () => {
    if (!selectedField) return;
    onConfirm(buildConfig());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-center text-lg font-medium">插入附件</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 选择字段 */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-500">选择字段</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择字段" />
                </SelectTrigger>
                <SelectContent>
                  {filteredFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      <div className="flex items-center gap-2">
                        <FileImage className="w-4 h-4 text-blue-500" />
                        <span>{field}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 显示模式 */}
            <RadioGroup 
              value={displayMode} 
              onValueChange={(v) => setDisplayMode(v as any)}
              className="flex flex-col gap-2 mt-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="image_only" id="image_only" />
                  <Label htmlFor="image_only" className="text-sm cursor-pointer">只显示图片</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>仅显示图片，不显示文件名和详细信息</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="basic_info" id="basic_info" />
                  <Label htmlFor="basic_info" className="text-sm cursor-pointer">基础信息</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>只显示文件名称，如：XXX.JPG、XXX.docx</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center justify-between opacity-50">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="advanced" id="advanced" disabled className="cursor-not-allowed" />
                  <Label htmlFor="advanced" className="text-sm text-gray-400 cursor-not-allowed">高级显示（即将推出）</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>显示图片和详细信息（File、URL）- 功能开发中</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </RadioGroup>
          </div>

          {/* 图片尺寸 */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-500">图片尺寸</Label>
            <RadioGroup 
              value={sizeMode} 
              onValueChange={(v) => setSizeMode(v as any)}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="text-sm cursor-pointer">自动</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed_width" id="fixed_width" />
                <Label htmlFor="fixed_width" className="text-sm cursor-pointer">固定宽度</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed_height" id="fixed_height" />
                <Label htmlFor="fixed_height" className="text-sm cursor-pointer">固定高度</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed_size" id="fixed_size" />
                <Label htmlFor="fixed_size" className="text-sm cursor-pointer">固定尺寸</Label>
              </div>
            </RadioGroup>

            {/* 尺寸输入 */}
            {(sizeMode === 'fixed_width' || sizeMode === 'fixed_size') && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">宽度:</Label>
                <Input 
                  type="number" 
                  value={width} 
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">px</span>
              </div>
            )}
            {(sizeMode === 'fixed_height' || sizeMode === 'fixed_size') && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">高度:</Label>
                <Input 
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">px</span>
              </div>
            )}

            {/* 一图一行开关 */}
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="onePerLine" className="text-sm cursor-pointer">一图一行</Label>
              <Switch 
                id="onePerLine" 
                checked={onePerLine} 
                onCheckedChange={setOnePerLine} 
              />
            </div>
          </div>

          {/* 对齐方式 */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-500">对齐方式</Label>
            <Select value={align} onValueChange={(v) => setAlign(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">左对齐</SelectItem>
                <SelectItem value="center">居中</SelectItem>
                <SelectItem value="right">右对齐</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 无数据时显示 */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-500">无数据时显示</Label>
            <Select value={emptyDisplay} onValueChange={(v) => setEmptyDisplay(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认文案</SelectItem>
                <SelectItem value="custom">自定义文案</SelectItem>
              </SelectContent>
            </Select>
            {emptyDisplay === 'custom' && (
              <Input 
                placeholder="请输入自定义文案"
                value={emptyCustomText}
                onChange={(e) => setEmptyCustomText(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* 预览区域 */}
          <AttachmentVariablePreview 
            config={buildConfig()} 
            data={currentFieldPreviewData}
          />
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t flex justify-end">
          <Button 
            onClick={handleConfirm}
            disabled={!selectedField}
            className="bg-blue-500 hover:bg-blue-600"
          >
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InsertAttachmentDialog;
