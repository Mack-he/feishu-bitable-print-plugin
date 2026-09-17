'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Layout, ImageIcon, Upload, Wand2, FileCheck, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type ElementTypeString = 'text' | 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'barcode' | 'qrcode' | 'line' | 'rectangle';

interface AIGenerateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateGenerated?: (template: any) => void;
}

interface GeneratedElement {
  id: string;
  type: ElementTypeString;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  style?: Record<string, any>;
}

interface GeneratedTemplate {
  name: string;
  description: string;
  elements: GeneratedElement[];
  pageSize: string;
  orientation: 'portrait' | 'landscape';
}

const EXAMPLE_PROMPTS = [
  '创建一个员工入职登记表，包含姓名、部门、职位、联系方式等基本信息字段',
  '设计一个产品合格证模板，包含产品名称、规格型号、生产日期、质检人员签名区域',
  '制作一个会议签到表，包含会议主题、时间、地点、参会人员签名栏',
  '生成一个请假申请表，包含请假类型、起止时间、请假事由、审批签字区',
  '创建一个监理通知单模板，包含工程名称、编号、致送单位、事由、详细内容、落款盖章区',
  '设计一个工程巡查记录表，包含巡查日期、检查项目、发现问题、整改要求、检查人员签字栏',
];

const LAYOUT_PRESETS = [
  { id: 'single', name: '单栏布局', description: '简洁的单列内容布局', icon: Layout },
  { id: 'double', name: '双栏布局', description: '左右分栏的经典布局', icon: Layout },
  { id: 'header-content', name: '标题+内容', description: '顶部标题+下方内容', icon: Layout },
  { id: 'form-style', name: '表单样式', description: '带标签和输入框的表单布局', icon: FileCheck },
  { id: 'card-style', name: '卡片样式', description: '卡片式分组布局', icon: Layout },
  { id: 'table-style', name: '表格样式', description: '行列分明的表格布局', icon: Layout },
];

export function AIGenerateTemplateDialog({
  open,
  onOpenChange,
  onTemplateGenerated,
}: AIGenerateTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState('natural');
  const [prompt, setPrompt] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep(1);

    try {
      // Simulate AI generation steps
      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationStep(2);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationStep(3);

      // Generate mock template based on input
      const mockTemplate: GeneratedTemplate = {
        name: prompt.slice(0, 20) + '...' || 'AI生成模板',
        description: prompt || '智能生成的专业模板',
        pageSize: 'A4',
        orientation: 'portrait',
        elements: generateMockElements(),
      };

      await new Promise(resolve => setTimeout(resolve, 600));
      setGeneratedTemplate(mockTemplate);
      setGenerationStep(4);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockElements = (): GeneratedElement[] => {
    const elements: GeneratedElement[] = [];
    
    // Add title
    elements.push({
      id: `el-${Date.now()}-title`,
      type: 'text',
      x: 50,
      y: 40,
      width: 500,
      height: 40,
      content: prompt.slice(0, 15) || '智能生成模板',
      style: { fontSize: '24px', fontWeight: 'bold', textAlign: 'center' },
    });

    // Add some form fields
    const labels = ['姓名', '部门', '日期', '备注'];
    labels.forEach((label, index) => {
      const yPos = 120 + index * 80;
      
      // Label
      elements.push({
        id: `el-${Date.now()}-label-${index}`,
        type: 'text',
        x: 50,
        y: yPos,
        width: 100,
        height: 30,
        content: `${label}:`,
        style: { fontSize: '14px', fontWeight: '500' },
      });

      // Input box (represented as rectangle)
      elements.push({
        id: `el-${Date.now()}-input-${index}`,
        type: 'rectangle',
        x: 160,
        y: yPos - 5,
        width: 400,
        height: 35,
        style: { borderWidth: '1px', borderColor: '#ccc', backgroundColor: '#fafafa' },
      });
    });

    return elements;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseTemplate = () => {
    if (generatedTemplate && onTemplateGenerated) {
      onTemplateGenerated(generatedTemplate);
    }
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setPrompt('');
    setSelectedLayout(null);
    setUploadedImage(null);
    setGeneratedTemplate(null);
    setGenerationStep(0);
    setActiveTab('natural');
  };

  const canGenerate = () => {
    switch (activeTab) {
      case 'natural':
        return prompt.trim().length > 0;
      case 'layout':
        return selectedLayout !== null;
      case 'image':
        return uploadedImage !== null;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetState();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">AI 生成模板</DialogTitle>
              <DialogDescription>
                选择一种方式，让 AI 为您智能生成专业排版模板
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex h-[600px]">
          {/* Left Panel - Input Options */}
          <div className="w-1/2 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-4">
                <TabsTrigger value="natural" className="gap-1">
                  <Wand2 className="w-4 h-4" />
                  自然语言
                </TabsTrigger>
                <TabsTrigger value="layout" className="gap-1">
                  <Layout className="w-4 h-4" />
                  智能布局
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-1">
                  <ImageIcon className="w-4 h-4" />
                  图片识别
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value="natural" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">描述您想要的模板</Label>
                    <Textarea
                      id="prompt"
                      placeholder="例如：创建一个员工入职登记表，包含姓名、部门、职位、联系方式等基本信息字段..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[160px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">示例提示词</Label>
                    <div className="space-y-2">
                      {EXAMPLE_PROMPTS.map((example, index) => (
                        <Card
                          key={index}
                          className="p-3 cursor-pointer hover:border-primary transition-colors"
                          onClick={() => setPrompt(example)}
                        >
                          <p className="text-sm text-muted-foreground line-clamp-2">{example}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>选择布局样式</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {LAYOUT_PRESETS.map((layout) => (
                        <Card
                          key={layout.id}
                          className={cn(
                            'p-4 cursor-pointer transition-all hover:border-primary',
                            selectedLayout === layout.id && 'border-primary bg-primary/5'
                          )}
                          onClick={() => setSelectedLayout(layout.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <layout.icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{layout.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {layout.description}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {selectedLayout && (
                    <div className="space-y-2">
                      <Label htmlFor="layout-prompt">补充描述（可选）</Label>
                      <Textarea
                        id="layout-prompt"
                        placeholder="描述您想要的主题、颜色、内容等..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="image" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>上传参考图片</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    
                    {!uploadedImage ? (
                      <Card
                        className="border-dashed cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="p-8 flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="font-medium">点击上传图片</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            支持 JPG、PNG、GIF 格式
                          </p>
                        </div>
                      </Card>
                    ) : (
                      <div className="relative">
                        <img
                          src={uploadedImage}
                          alt="Uploaded"
                          className="w-full h-48 object-contain rounded-lg border"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setUploadedImage(null)}
                        >
                          重新上传
                        </Button>
                      </div>
                    )}
                  </div>

                  {uploadedImage && (
                    <div className="space-y-2">
                      <Label htmlFor="image-prompt">补充描述（可选）</Label>
                      <Textarea
                        id="image-prompt"
                        placeholder="描述您希望的调整或特殊要求..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>

              <div className="p-6 border-t">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!canGenerate() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      开始生成
                    </>
                  )}
                </Button>
              </div>
            </Tabs>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 bg-muted/30 flex flex-col">
            <div className="px-6 py-4 border-b bg-background">
              <h3 className="font-medium">预览</h3>
              <p className="text-sm text-muted-foreground">
                {generatedTemplate ? 'AI 生成的模板预览' : '生成结果将在这里显示'}
              </p>
            </div>

            <ScrollArea className="flex-1 p-6">
              {!generatedTemplate && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <p className="font-medium">等待生成</p>
                  <p className="text-sm mt-1">选择左侧选项并开始生成</p>
                </div>
              )}

              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <p className="font-medium">
                    {generationStep === 1 && '正在分析需求...'}
                    {generationStep === 2 && '正在设计布局...'}
                    {generationStep === 3 && '正在生成元素...'}
                    {generationStep === 4 && '即将完成...'}
                  </p>
                  <div className="w-48 h-2 bg-muted rounded-full mt-4 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(generationStep / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {generatedTemplate && !isGenerating && (
                <div className="space-y-4">
                  {/* Preview Card */}
                  <Card className="overflow-hidden bg-white dark:bg-gray-900">
                    <div className="aspect-[210/297] relative bg-white p-8">
                      {/* Mock Preview of Generated Template */}
                      <div className="w-full h-full border border-dashed border-gray-300 rounded-lg p-4">
                        <div className="text-center mb-6">
                          <h2 className="text-xl font-bold text-gray-800">
                            {generatedTemplate.name}
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            {generatedTemplate.description}
                          </p>
                        </div>

                        <div className="space-y-4">
                          {generatedTemplate.elements
                            .filter(el => el.type === 'text' && el.content?.includes(':'))
                            .map((el, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                              <span className="text-sm font-medium w-16">
                                {el.content?.replace(':', '')}
                              </span>
                              <div className="flex-1 h-8 border border-gray-200 rounded bg-gray-50" />
                            </div>
                          ))}
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-200">
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>A4 {generatedTemplate.orientation === 'portrait' ? '纵向' : '横向'}</span>
                            <span>{generatedTemplate.elements.length} 个元素</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Template Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{generatedTemplate.pageSize}</Badge>
                      <Badge variant="outline">
                        {generatedTemplate.orientation === 'portrait' ? '纵向' : '横向'}
                      </Badge>
                      <Badge variant="outline">{generatedTemplate.elements.length} 元素</Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2" onClick={handleUseTemplate}>
                      <FileCheck className="w-4 h-4" />
                      使用模板
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      导出
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
