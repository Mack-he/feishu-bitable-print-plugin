'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateCanvasPreview } from '@/components/template/TemplateCanvasPreview';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  MoreHorizontal,
  Search,
  Eye,
  Copy,
  X,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function TemplatesPage() {
  const { templates, fetchTemplates, addTemplate, updateTemplate, deleteTemplate } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  // 加载模板列表
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 过滤模板
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    await addTemplate({
      name: formData.name,
      description: formData.description,
      data: {},
    });
    setFormData({ name: '', description: '' });
    setIsAddDialogOpen(false);
  };

  const handleEdit = async () => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        name: formData.name,
        description: formData.description,
      });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模板吗？')) {
      await deleteTemplate(id);
    }
  };

  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
    });
    setIsEditDialogOpen(true);
  };

  const openPreviewDialog = (template: any) => {
    setPreviewTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模板管理</h1>
          <p className="text-muted-foreground">
            管理打印模板和预设
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新增模板
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增模板</DialogTitle>
              <DialogDescription>
                创建一个新的打印模板
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">模板名称</Label>
                <Input
                  id="name"
                  placeholder="请输入模板名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">模板描述</Label>
                <Textarea
                  id="description"
                  placeholder="请输入模板描述"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdd}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 模板列表 */}
      <Card>
        <CardHeader>
          <CardTitle>模板列表</CardTitle>
          <CardDescription>
            共 {filteredTemplates.length} 个模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板名称</TableHead>
                <TableHead>创建者</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>公开</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {template.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={template.userAvatar} alt={template.userName} />
                        <AvatarFallback>{template.userName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{template.userName || '未知用户'}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {template.feishuUserId?.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isPublic ? 'default' : 'secondary'}>
                      {template.isPublic ? '是' : '否'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreviewDialog(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          预览
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 预览对话框 - 扩大版本 */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">模板预览</DialogTitle>
                <DialogDescription className="mt-1">
                  {previewTemplate?.name} · {previewTemplate?.description || '无描述'}
                </DialogDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsPreviewDialogOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col h-[calc(95vh-120px)]">
            {previewTemplate ? (
              <Tabs defaultValue="canvas" className="flex-1 flex flex-col">
                <TabsList className="mx-6 mt-4">
                  <TabsTrigger value="canvas">画布预览</TabsTrigger>
                  <TabsTrigger value="info">基本信息</TabsTrigger>
                  <TabsTrigger value="raw">原始数据</TabsTrigger>
                </TabsList>
                
                <TabsContent value="canvas" className="flex-1 overflow-auto p-6 m-0">
                  <TemplateCanvasPreview 
                    templateData={previewTemplate.data} 
                    scale={0.6}
                    showStats={true}
                    showVariables={true}
                  />
                </TabsContent>
                
                <TabsContent value="info" className="flex-1 overflow-auto p-6 m-0">
                  <div className="max-w-2xl space-y-6">
                    {/* 模板信息卡片 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">基本信息</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">模板名称</p>
                            <p className="font-medium">{previewTemplate.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">创建者</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={previewTemplate.userAvatar} />
                                <AvatarFallback>{previewTemplate.userName?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{previewTemplate.userName || '未知用户'}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">创建时间</p>
                            <p className="font-medium">{new Date(previewTemplate.createdAt).toLocaleString('zh-CN')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">更新时间</p>
                            <p className="font-medium">{new Date(previewTemplate.updatedAt).toLocaleString('zh-CN')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">公开状态</p>
                            <Badge variant={previewTemplate.isPublic ? 'default' : 'secondary'}>
                              {previewTemplate.isPublic ? '公开' : '私有'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">飞书用户ID</p>
                            <p className="font-mono text-xs">{previewTemplate.feishuUserId || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 组件统计 */}
                    {previewTemplate.data?.components && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">组件统计</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-slate-700">
                                {previewTemplate.data.components.length}
                              </p>
                              <p className="text-xs text-muted-foreground">总组件数</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-slate-700">
                                {previewTemplate.data.components.filter((c: any) => c.type === 'text').length}
                              </p>
                              <p className="text-xs text-muted-foreground">文本组件</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-slate-700">
                                {previewTemplate.data.components.filter((c: any) => c.type === 'table').length}
                              </p>
                              <p className="text-xs text-muted-foreground">表格组件</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-slate-700">
                                {previewTemplate.data.pageConfig?.width || 'A4'} × {previewTemplate.data.pageConfig?.height || 'A4'}
                              </p>
                              <p className="text-xs text-muted-foreground">页面尺寸</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="raw" className="flex-1 overflow-auto p-6 m-0">
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(previewTemplate, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">加载中...</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="ghost" onClick={() => setIsPreviewDialogOpen(false)}>
              关闭
            </Button>
            <Button 
              onClick={() => {
                setIsPreviewDialogOpen(false);
                openEditDialog(previewTemplate);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              编辑模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
