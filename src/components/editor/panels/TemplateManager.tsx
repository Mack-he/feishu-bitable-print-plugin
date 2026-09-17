'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useEditorStore } from '@/store/editorStore';
import { PrintTemplate } from '@/types/editor';
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Download, 
  Upload,
  FileText,
  Clock,
  Pencil,
} from 'lucide-react';

interface TemplateManagerProps {
  onLoadTemplate: (template: PrintTemplate) => void;
}

export function TemplateManager({ onLoadTemplate }: TemplateManagerProps) {
  const { 
    savedTemplates, 
    saveTemplate, 
    deleteTemplate, 
    exportTemplate,
    templateName,
    setTemplateName,
  } = useEditorStore();
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 保存模板
  const handleSave = () => {
    if (newTemplateName.trim()) {
      setTemplateName(newTemplateName.trim());
      saveTemplate();
      setIsSaveDialogOpen(false);
      setNewTemplateName('');
    }
  };

  // 打开保存对话框
  const openSaveDialog = () => {
    setNewTemplateName(templateName);
    setIsSaveDialogOpen(true);
  };

  // 导出模板为 JSON 文件
  const handleExportTemplate = () => {
    const template = exportTemplate();
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入模板
  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const template = JSON.parse(event.target?.result as string) as PrintTemplate;
        onLoadTemplate(template);
      } catch (error) {
        console.error('Failed to import template:', error);
        alert('导入模板失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3">
      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={openSaveDialog}>
          <Save className="w-4 h-4 mr-1" />
          保存
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsLoadDialogOpen(true)}>
          <FolderOpen className="w-4 h-4 mr-1" />
          加载
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleExportTemplate}>
          <Download className="w-4 h-4 mr-1" />
          导出
        </Button>
        <label className="flex-1">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <span>
              <Upload className="w-4 h-4 mr-1" />
              导入
            </span>
          </Button>
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportTemplate}
          />
        </label>
      </div>

      {/* 已保存模板列表 */}
      {savedTemplates.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">已保存模板</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {savedTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer group"
                onClick={() => onLoadTemplate(template)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(template.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除此模板？')) {
                      deleteTemplate(template.id);
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存对话框 */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">模板名称</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="输入模板名称"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!newTemplateName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 加载对话框 */}
      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>加载模板</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {savedTemplates.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded border hover:border-primary cursor-pointer"
                    onClick={() => {
                      onLoadTemplate(template);
                      setIsLoadDialogOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(template.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{template.components.length} 组件</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无保存的模板</p>
                <p className="text-xs mt-1">请先保存当前排版</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
