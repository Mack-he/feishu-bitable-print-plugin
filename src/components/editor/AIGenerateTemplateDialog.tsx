'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  ArrowLeft,
  FileCheck,
  ImageIcon,
  Layout,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/userStore';
import type { AiFieldBrief } from '@/lib/ai/template-spec';

type GenerateMode = 'natural' | 'layout' | 'image';

interface GeneratedTemplatePayload {
  name: string;
  description: string;
  components: any[];
  pageConfig: any;
  styleConfig: any;
  variables: string[];
  unknownVariables: string[];
}

interface GenerateResult {
  template: GeneratedTemplatePayload;
  mode: 'ai' | 'rule';
  model: string | null;
  notice: string | null;
}

export interface AIGenerateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前数据表字段：大模型会用这些字段名做占位符 */
  fields?: AiFieldBrief[];
  tableName?: string;
  /** 点击「使用此模板」：保存模板并进入编辑器 */
  onUseTemplate?: (payload: { name: string; description: string; data: unknown }) => Promise<void> | void;
}

const EXAMPLE_PROMPTS = [
  '创建一个员工入职登记表，包含姓名、部门、职位、联系方式等基本信息字段',
  '设计一个产品合格证模板，包含产品名称、规格型号、生产日期、质检人员签名区域',
  '制作一个会议签到表，包含会议主题、时间、地点、参会人员签名栏',
  '生成一个请假申请表，包含请假类型、起止时间、请假事由、审批签字区',
  '创建一个监理通知单模板，包含工程名称、编号、致送单位、事由、详细内容、落款盖章区',
  '设计一个购销合同模板，包含甲乙方信息、标的、金额、交付方式、违约责任、签章区',
];

const LAYOUT_PRESETS = [
  { id: 'single', name: '单栏布局', description: '从上到下单列排布', icon: Layout },
  { id: 'double', name: '双栏布局', description: '左右分栏的经典布局', icon: Layout },
  { id: 'header-content', name: '标题+内容', description: '顶部标题+下方内容', icon: Layout },
  { id: 'form-style', name: '表单样式', description: '标签与填写区左右对应', icon: FileCheck },
  { id: 'card-style', name: '卡片样式', description: '按信息分组的小表格', icon: Layout },
  { id: 'table-style', name: '表格样式', description: '行列分明的大表格', icon: Layout },
];

const GENERATING_STEPS = ['正在分析需求…', '正在设计布局…', '正在生成元素…', '即将完成…'];

export function AIGenerateTemplateDialog({
  open,
  onOpenChange,
  fields = [],
  tableName,
  onUseTemplate,
}: AIGenerateTemplateDialogProps) {
  const token = useUserStore((state) => state.token);

  const [activeTab, setActiveTab] = useState<GenerateMode>('natural');
  const [prompt, setPrompt] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成等待期间滚动提示文案，让等待过程有反馈
  useEffect(() => {
    if (!isGenerating) return;
    setStep(0);
    const timer = setInterval(() => {
      setStep((current) => (current < 2 ? current + 1 : current));
    }, 1800);
    return () => clearInterval(timer);
  }, [isGenerating]);

  const resetState = () => {
    setPrompt('');
    setSelectedLayout(null);
    setUploadedImage(null);
    setIsGenerating(false);
    setStep(0);
    setResult(null);
    setError(null);
    setIsSaving(false);
    setActiveTab('natural');
  };

  const validate = (): { ok: boolean; reason: string } => {
    if (activeTab === 'natural' && !prompt.trim()) return { ok: false, reason: '请先描述您想要的模板' };
    if (activeTab === 'layout' && !selectedLayout) return { ok: false, reason: '请先选择一种布局样式' };
    if (activeTab === 'image' && !uploadedImage) return { ok: false, reason: '请先上传参考图片' };
    return { ok: true, reason: '' };
  };
  const validation = validate();

  const handleGenerate = async () => {
    if (!validation.ok || isGenerating) return;

    if (!token) {
      setError('登录状态已失效，请重新登录后再试');
      return;
    }

    setError(null);
    setResult(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: activeTab,
          prompt: prompt.trim(),
          layoutId: selectedLayout,
          layoutName: LAYOUT_PRESETS.find((item) => item.id === selectedLayout)?.name || null,
          imageDataUrl: uploadedImage,
          fields,
          tableName,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `生成失败（HTTP ${response.status}）`);
      }

      setStep(3);
      setResult(payload.data as GenerateResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseTemplate = async () => {
    if (!result || !onUseTemplate) return;
    setIsSaving(true);
    setError(null);
    try {
      const { template } = result;
      await onUseTemplate({
        name: template.name,
        description: template.description,
        data: {
          components: template.components,
          pageConfig: template.pageConfig,
          styleConfig: template.styleConfig,
        },
      });
      onOpenChange(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存模板失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('图片不能超过 4MB，请压缩后再上传');
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setUploadedImage((loadEvent.target?.result as string) || null);
      setError(null);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const fieldSummary = useMemo(() => {
    const names = fields.filter((field) => field?.name).map((field) => field.name);
    return { count: names.length, preview: names.slice(0, 6), rest: Math.max(0, names.length - 6) };
  }, [fields]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden p-0"
        style={{
          width: 'min(96vw, 62rem)',
          maxWidth: 'min(96vw, 62rem)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 标题栏 */}
        <DialogHeader className="flex-shrink-0 border-b px-4 py-4 text-left sm:px-6">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl">AI 生成模板</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                选择一种方式，让 AI 根据当前表格字段生成可打印的排版模板
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 主体：窄屏上下堆叠，宽屏左右分栏；生成结果出来后窄屏直接切到预览 */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* 左：输入区 */}
          <div
            className={cn(
              'min-h-0 w-full flex-col md:flex md:w-1/2 md:border-r',
              result ? 'hidden md:flex' : 'flex'
            )}
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as GenerateMode)}
              className="flex min-h-0 flex-1 flex-col gap-0"
            >
              <div className="flex-shrink-0 px-4 pt-4 sm:px-5">
                <TabsList className="grid h-9 w-full grid-cols-3">
                  <TabsTrigger value="natural" className="gap-1.5 px-1 text-xs sm:text-sm">
                    <Wand2 className="hidden h-4 w-4 sm:block" />
                    自然语言
                  </TabsTrigger>
                  <TabsTrigger value="layout" className="gap-1.5 px-1 text-xs sm:text-sm">
                    <Layout className="hidden h-4 w-4 sm:block" />
                    智能布局
                  </TabsTrigger>
                  <TabsTrigger value="image" className="gap-1.5 px-1 text-xs sm:text-sm">
                    <ImageIcon className="hidden h-4 w-4 sm:block" />
                    图片识别
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {/* 自然语言 */}
                <TabsContent value="natural" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt">描述您想要的模板</Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="例如：创建一个员工入职登记表，包含姓名、部门、职位、联系方式等基本信息字段…"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">示例提示词</Label>
                    <div className="space-y-2">
                      {EXAMPLE_PROMPTS.map((example) => (
                        <Card
                          key={example}
                          className="cursor-pointer p-3 transition-colors hover:border-primary"
                          onClick={() => setPrompt(example)}
                        >
                          <p className="line-clamp-2 text-sm text-muted-foreground">{example}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* 智能布局 */}
                <TabsContent value="layout" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>选择布局样式</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {LAYOUT_PRESETS.map((layout) => (
                        <Card
                          key={layout.id}
                          className={cn(
                            'cursor-pointer p-3 transition-all hover:border-primary',
                            selectedLayout === layout.id && 'border-primary bg-primary/5'
                          )}
                          onClick={() => setSelectedLayout(layout.id)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                              <layout.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{layout.name}</p>
                              <p className="line-clamp-2 text-xs text-muted-foreground">{layout.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-layout-prompt">补充描述（可选）</Label>
                    <Textarea
                      id="ai-layout-prompt"
                      placeholder="描述主题、用途、需要包含的内容…"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-[90px] resize-none"
                    />
                  </div>
                </TabsContent>

                {/* 图片识别 */}
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
                        className="cursor-pointer border-dashed transition-colors hover:border-primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center p-6 text-center">
                          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Upload className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <p className="font-medium">点击上传图片</p>
                          <p className="mt-1 text-sm text-muted-foreground">支持 JPG、PNG，大小不超过 4MB</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadedImage}
                          alt="上传的参考图"
                          className="h-44 w-full rounded-lg border object-contain"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-2"
                          onClick={() => setUploadedImage(null)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          重新上传
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-image-prompt">补充描述（可选）</Label>
                    <Textarea
                      id="ai-image-prompt"
                      placeholder="说明图片里需要保留的内容或需要调整的部分…"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-[90px] resize-none"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    图片识别需要多模态模型；如果所用模型不支持图片输入，将按您的描述生成。
                  </p>
                </TabsContent>

                {/* 字段提示 */}
                <div className="mt-4 rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    当前表格：{tableName || '未命名表格'} · 可用字段 {fieldSummary.count} 个
                  </p>
                  {fieldSummary.count > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fieldSummary.preview.map((name) => (
                        <Badge key={name} variant="secondary" className="text-[11px] font-normal">
                          {name}
                        </Badge>
                      ))}
                      {fieldSummary.rest > 0 && (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          +{fieldSummary.rest}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 左栏底部：错误提示 + 确认按钮，固定在底部不会被内容挤掉 */}
              <div className="flex-shrink-0 space-y-2 border-t p-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="break-all">{error}</span>
                  </div>
                )}
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!validation.ok || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      开始生成
                    </>
                  )}
                </Button>
                {!validation.ok && !isGenerating && (
                  <p className="text-center text-xs text-muted-foreground">{validation.reason}</p>
                )}
              </div>
            </Tabs>
          </div>

          {/* 右：预览区 */}
          <div
            className={cn(
              'min-h-0 w-full flex-col bg-muted/30 md:flex md:w-1/2',
              result ? 'flex' : 'hidden md:flex'
            )}
          >
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h3 className="text-sm font-medium">预览</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {result ? result.template.name : isGenerating ? '正在生成…' : '生成结果将在这里显示'}
                </p>
              </div>
              {result && (
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setResult(null)}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  返回修改
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {/* 空状态 */}
              {!result && !isGenerating && (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <Sparkles className="h-10 w-10" />
                  </div>
                  <p className="font-medium">等待生成</p>
                  <p className="mt-1 text-sm">填写左侧内容后点击「开始生成」</p>
                </div>
              )}

              {/* 生成中 */}
              {isGenerating && (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                  <p className="font-medium">{GENERATING_STEPS[step]}</p>
                  <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${((step + 1) / 4) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">大模型生成通常需要 10~30 秒</p>
                </div>
              )}

              {/* 结果 */}
              {result && !isGenerating && (
                <div className="space-y-3">
                  {result.mode === 'rule' && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>{result.notice || '未接入大模型，已用内置规则生成。'}</span>
                    </div>
                  )}

                  {result.notice && result.mode === 'ai' && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                      {result.notice}
                    </div>
                  )}

                  {/* 纸张预览 */}
                  <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900">
                    <AiTemplatePreview components={result.template.components} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {result.mode === 'ai' ? `大模型生成${result.model ? ` · ${result.model}` : ''}` : '规则生成'}
                    </Badge>
                    <Badge variant="outline">{result.template.components.length} 个组件</Badge>
                    {result.template.variables.length > 0 && (
                      <Badge variant="outline">{result.template.variables.length} 个变量</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 右栏底部操作区 */}
            {result && !isGenerating && (
              <div className="flex-shrink-0 space-y-2 border-t bg-background p-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="break-all">{error}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleUseTemplate} disabled={isSaving || !onUseTemplate}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                    {isSaving ? '保存中…' : '使用此模板'}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleGenerate}>
                    <RefreshCw className="h-4 w-4" />
                    重新生成
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 生成结果的精简预览：按组件模型渲染，变量用下划线标出 */
function AiTemplatePreview({ components }: { components: any[] }) {
  const renderText = (text: string, key: string) => {
    if (!text) return null;
    const parts = text.split(/(\[[^[\]\n]{1,40}\])/g);
    return (
      <span key={key}>
        {parts.map((part, index) =>
          /^\[[^[\]\n]{1,40}\]$/.test(part) ? (
            <span key={index} className="rounded bg-blue-50 px-1 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      {components.map((component, index) => {
        const key = component.id || `preview-${index}`;
        const textStyle = component.textStyle || {};

        switch (component.type) {
          case 'heading':
          case 'text':
          case 'paragraph': {
            const isHeading = component.type === 'heading';
            return (
              <div
                key={key}
                style={{
                  fontSize: `${Math.min(isHeading ? (textStyle.fontSize || 20) : textStyle.fontSize || 14, 24)}px`,
                  fontWeight: textStyle.bold || isHeading ? 700 : 400,
                  textAlign: textStyle.align || (isHeading ? 'center' : 'left'),
                  color: textStyle.color || '#111827',
                  lineHeight: textStyle.lineHeight || 1.6,
                  marginBottom: `${Math.min(textStyle.paragraphSpacing ?? 6, 16)}px`,
                  textIndent: component.type === 'paragraph' ? `${(component.indent || 0) * 0.5}em` : undefined,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {renderText(String(component.content || ''), key)}
              </div>
            );
          }
          case 'list':
            return (
              <ul
                key={key}
                className="ml-4 list-outside space-y-0.5"
                style={{
                  listStyleType: component.listType === 'ordered' ? 'decimal' : 'disc',
                  fontSize: `${Math.min(textStyle.fontSize || 14, 20)}px`,
                }}
              >
                {(component.items || []).map((item: string, itemIndex: number) => (
                  <li key={itemIndex}>{renderText(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          case 'table': {
            const rows = component.tableConfig?.cells || [];
            const colWidths = component.tableConfig?.colWidths || [];
            const showInner = component.tableConfig?.showInnerBorder !== false;
            const showOuter = component.tableConfig?.showOuterBorder !== false;
            if (rows.length === 0) return null;
            return (
              <div key={key} className="overflow-x-auto">
                <table
                  className="w-full border-collapse text-[11px]"
                  style={{ tableLayout: colWidths.length ? 'fixed' : 'auto' }}
                >
                  <tbody>
                    {rows.map((row: any[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell: any, colIndex: number) => (
                          <td
                            key={cell.id || `${rowIndex}-${colIndex}`}
                            colSpan={cell.colSpan || 1}
                            rowSpan={cell.rowSpan || 1}
                            className="px-1.5 py-1 align-middle text-gray-800"
                            style={{
                              border: showInner ? '1px solid #9ca3af' : 'none',
                              borderTop: showOuter || rowIndex > 0 ? '1px solid #9ca3af' : 'none',
                              borderLeft: showOuter || colIndex > 0 ? '1px solid #9ca3af' : 'none',
                              width: colWidths[colIndex] ? `${colWidths[colIndex]}px` : undefined,
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {renderText(String(cell.content || ''), `${key}-${rowIndex}-${colIndex}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'line':
            return (
              <hr
                key={key}
                style={{
                  borderTop: `${component.thickness || 1}px ${component.style || 'solid'} ${component.color || '#000000'}`,
                  borderBottom: 'none',
                  margin: '8px 0',
                }}
              />
            );
          case 'qrcode':
          case 'barcode':
            return (
              <div
                key={key}
                className="mx-auto flex h-12 w-24 items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400"
              >
                {component.type === 'qrcode' ? '二维码' : '条形码'}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}