'use client';

// 导入排版对话框：选择本地 Word(.docx) / Excel(.xlsx) 模板文件，
// 上传到 /api/templates/import 转换为排版组件后，可直接保存为我的模板并进入编辑器。

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/userStore';
import type { AiFieldBrief } from '@/lib/ai/template-spec';

interface ImportedTemplatePayload {
  name: string;
  description: string;
  components: any[];
  pageConfig: any;
  styleConfig: any;
  variables: string[];
  unknownVariables: string[];
}

interface ImportResult {
  template: ImportedTemplatePayload;
  source: 'docx' | 'xlsx';
  sheetName?: string;
  warnings: string[];
  notice: string | null;
}

interface SelectedFile {
  name: string;
  size: number;
  dataUrl: string;
  fileType: 'docx' | 'xlsx';
}

export interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前数据表字段：用于提示模板里的变量是否能匹配 */
  fields?: AiFieldBrief[];
  tableName?: string;
  /** 点击「使用此模板」：保存模板并进入编辑器 */
  onUseTemplate?: (payload: { name: string; description: string; data: unknown }) => Promise<void> | void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['docx', 'xlsx'];
const IMPORTING_STEPS = ['正在上传文件…', '正在解析模板内容…', '正在转换排版组件…'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ImportTemplateDialog({ open, onOpenChange, fields = [], tableName, onUseTemplate }: ImportTemplateDialogProps) {
  const token = useUserStore((state) => state.token);

  const [file, setFile] = useState<SelectedFile | null>(null);
  const [status, setStatus] = useState<'idle' | 'importing' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setStep(0);
    setResult(null);
    setError(null);
    setIsSaving(false);
  };

  const handleFile = (selected: File) => {
    setError(null);
    setResult(null);
    setStatus('idle');

    const lower = selected.name.toLowerCase();
    const ext = lower.split('.').pop() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      if (ext === 'doc' || ext === 'xls') {
        setError(`不支持旧版 .${ext} 格式，请先在 Office 中另存为 .${ext === 'doc' ? 'docx' : 'xlsx'} 后再导入`);
      } else {
        setError('仅支持 .docx（Word）与 .xlsx（Excel）文件');
      }
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('文件不能超过 10MB，请压缩后再导入');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setFile({
        name: selected.name,
        size: selected.size,
        dataUrl: String(loadEvent.target?.result || ''),
        fileType: ext === 'docx' ? 'docx' : 'xlsx',
      });
    };
    reader.onerror = () => setError('读取文件失败，请重新选择');
    reader.readAsDataURL(selected);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) handleFile(selected);
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    if (!file || status === 'importing') return;
    if (!token) {
      setError('登录状态已失效，请重新登录后再试');
      return;
    }

    setError(null);
    setStatus('importing');
    setStep(0);
    const stepTimer = window.setInterval(() => {
      setStep((current) => (current < IMPORTING_STEPS.length - 1 ? current + 1 : current));
    }, 900);

    try {
      const response = await fetch('/api/templates/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileData: file.dataUrl,
          fields: fields.map((field) => ({ name: field.name })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `导入失败（HTTP ${response.status}）`);
      }

      const data = payload.data as ImportResult | null;
      if (!data?.template || !Array.isArray(data.template.components)) {
        throw new Error('服务端返回数据不完整，请重试');
      }

      setResult(data);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请稍后重试');
      setStatus('idle');
    } finally {
      window.clearInterval(stepTimer);
    }
  };

  const handleUseTemplate = async () => {
    if (!result?.template || !onUseTemplate) return;
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

  const template = result?.template;
  const componentCount = template?.components?.length ?? 0;
  const tableCount = template?.components?.filter((component: any) => component?.type === 'table').length ?? 0;
  const imageCount = template?.components?.filter((component: any) => component?.type === 'image').length ?? 0;
  const variableCount = template?.variables?.length ?? 0;
  const unknownCount = template?.unknownVariables?.length ?? 0;

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
          width: 'min(96vw, 34rem)',
          maxWidth: 'min(96vw, 34rem)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 标题栏 */}
        <DialogHeader className="flex-shrink-0 border-b px-5 py-4 text-left">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-400">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">导入排版</DialogTitle>
              <DialogDescription className="text-xs">
                导入 Word 或 Excel 模板，自动转换为可编辑的排版组件
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 内容区 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {status === 'idle' && !file && (
            <>
              {/* 拖拽选区 */}
              <div
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                  isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-muted-foreground/30 hover:border-emerald-500/60 hover:bg-emerald-50/40'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium">点击选择文件，或将文件拖拽到这里</p>
                <p className="text-xs text-muted-foreground">支持 .docx（Word 模板）与 .xlsx（Excel 模板）</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.xlsx"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {/* 使用提示 */}
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1 font-medium text-foreground/80">
                  <Info className="h-3.5 w-3.5" />
                  导入说明
                </p>
                <p>· 文档中的变量占位符请写作 [字段名] 或 {'{{字段名}}'}，导入后会自动填充数据</p>
                <p>· 当前表格{tableName ? `「${tableName}」` : ''}已识别 {fields.length} 个字段，字段名与占位符一致即可匹配</p>
                <p>· 不支持旧版 .doc/.xls 格式，需先在 Office 中另存为新格式</p>
              </div>
            </>
          )}

          {/* 已选文件卡片 */}
          {status === 'idle' && file && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg',
                    file.fileType === 'docx' ? 'bg-blue-100' : 'bg-emerald-100'
                  )}
                >
                  {file.fileType === 'docx' ? (
                    <FileText className="h-5 w-5 text-blue-600" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.fileType === 'docx' ? 'Word 文档' : 'Excel 工作簿'} · {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFile(null)}
                  title="移除文件"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* 导入中 */}
          {status === 'importing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">{IMPORTING_STEPS[step]}</p>
              <p className="text-xs text-muted-foreground">{file?.name}</p>
            </div>
          )}

          {/* 导入结果 */}
          {status === 'done' && result?.template && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">解析成功，已转换为 {componentCount} 个排版组件</p>
              </div>

              {/* 统计 */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-lg font-semibold">{componentCount}</p>
                  <p className="text-xs text-muted-foreground">组件</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-lg font-semibold">{tableCount}</p>
                  <p className="text-xs text-muted-foreground">表格</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-lg font-semibold">{variableCount}</p>
                  <p className="text-xs text-muted-foreground">变量</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className={cn('text-lg font-semibold', unknownCount > 0 ? 'text-amber-600' : '')}>{unknownCount}</p>
                  <p className="text-xs text-muted-foreground">未知变量</p>
                </div>
              </div>

              {result.sheetName && (
                <p className="text-xs text-muted-foreground">已导入工作表「{result.sheetName}」</p>
              )}

              {result.notice && (
                <Alert className="border-amber-300 bg-amber-50 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-medium">变量提示</AlertTitle>
                  <AlertDescription className="text-xs">{result.notice}</AlertDescription>
                </Alert>
              )}

              {result.warnings.map((warning, index) => (
                <Alert key={index} className="text-xs">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">{warning}</AlertDescription>
                </Alert>
              ))}

              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                模板名「{result.template.name}」将保存到「我的模板」，导入后可在编辑器中继续调整
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">导入失败</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* 底部操作 */}
        <DialogFooter className="flex-shrink-0 border-t px-5 py-4">
          {status === 'done' ? (
            <>
              <Button variant="outline" onClick={resetState}>
                继续导入其他文件
              </Button>
              <Button onClick={handleUseTemplate} disabled={isSaving || !onUseTemplate}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                使用此模板
                {!isSaving && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleImport} disabled={!file || status === 'importing'} className="min-w-24">
                {status === 'importing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                开始导入
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}