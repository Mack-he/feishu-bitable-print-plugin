'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { resolvePaper } from '@/lib/paper';
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
import { TemplateGrantsDialog } from '@/components/admin/TemplateGrantsDialog';
import { PublishRequestsPanel } from '@/components/admin/PublishRequestsPanel';
import {
  Edit,
  Trash2,
  FileText,
  MoreHorizontal,
  Search,
  Eye,
  Ban,
  CheckCircle2,
  Upload,
  ShieldCheck,
  Loader2,
  X,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function TemplatesPage() {
  const { templates, fetchTemplates, updateTemplate, deleteTemplate, token: adminToken } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  // 授权设置 / 发布为企业模板
  const [grantsTarget, setGrantsTarget] = useState<any>(null);
  const [publishTarget, setPublishTarget] = useState<any>(null);
  const [publishName, setPublishName] = useState('');
  const [publishVisibility, setPublishVisibility] = useState<'public' | 'restricted'>('public');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // 加载模板列表
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 过滤模板
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** 把用户模板发布为企业模板（内容快照 + 可选授权范围） */
  const handlePublish = async () => {
    if (!publishTarget || !adminToken) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const isRepublish = !!publishTarget.isEnterprise;
      const response = await fetch('/api/admin/templates/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          sourceTemplateId: isRepublish ? publishTarget.sourceTemplateId : publishTarget.id,
          enterpriseTemplateId: isRepublish ? publishTarget.id : undefined,
          name: publishName.trim() || publishTarget.name,
          visibility: publishVisibility,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '发布失败');
      setPublishTarget(null);
      await fetchTemplates();
      if (result.data?.id) {
        setGrantsTarget({ id: result.data.id, name: result.data.name, visibility: result.data.visibility });
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : '发布失败');
    } finally {
      setIsPublishing(false);
    }
  };

  /** 停用 / 启用模板 */
  const handleToggleStatus = async (template: any) => {
    if (!adminToken) return;
    setBusyId(template.id);
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: template.id,
          status: template.status === 'disabled' ? 'active' : 'disabled',
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '操作失败');
      await fetchTemplates();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setBusyId(null);
    }
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
            管理用户模板、发布企业模板并配置授权范围（用户/部门）
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">模板列表</TabsTrigger>
          <TabsTrigger value="requests">发布申请</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'requests' ? (
        adminToken ? (
          <PublishRequestsPanel adminToken={adminToken} />
        ) : (
          <p className="text-sm text-muted-foreground">请先登录管理员账号</p>
        )
      ) : (
        <>
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
                <TableHead>来源 / 创建者</TableHead>
                <TableHead>可见范围</TableHead>
                <TableHead>授权数</TableHead>
                <TableHead>状态</TableHead>
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
                    {template.isEnterprise ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs bg-purple-600">企业模板</Badge>
                        {template.sourceTemplateId && (
                          <span className="text-xs text-muted-foreground">源模板 #{template.sourceTemplateId}</span>
                        )}
                      </div>
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.visibility === 'public' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {template.visibility === 'public'
                        ? '所有用户'
                        : template.visibility === 'restricted'
                          ? '指定授权'
                          : '仅创建者'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.visibility === 'restricted' ? `${template.grantCount || 0} 个对象` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.status === 'disabled' ? 'destructive' : 'secondary'} className="text-xs">
                      {template.status === 'disabled' ? '已停用' : '启用中'}
                    </Badge>
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
                        {template.isEnterprise ? (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                setGrantsTarget({ id: template.id, name: template.name, visibility: template.visibility })
                              }
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              授权设置
                            </DropdownMenuItem>
                            {template.sourceTemplateId && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPublishTarget(template);
                                  setPublishName(template.name);
                                  setPublishVisibility(template.visibility === 'restricted' ? 'restricted' : 'public');
                                  setPublishError(null);
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                从源模板重新发布
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setPublishTarget(template);
                                setPublishName(template.name);
                                setPublishVisibility('public');
                                setPublishError(null);
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              发布为企业模板
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleStatus(template)} disabled={busyId === template.id}>
                          {busyId === template.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : template.status === 'disabled' ? (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          ) : (
                            <Ban className="h-4 w-4 mr-2" />
                          )}
                          {template.status === 'disabled' ? '启用' : '停用'}
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
                                {resolvePaper(previewTemplate.data.pageConfig).width} × {resolvePaper(previewTemplate.data.pageConfig).height} mm
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

      {/* 发布 / 重新发布为企业模板 */}
      <Dialog open={!!publishTarget} onOpenChange={(next) => !next && setPublishTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{publishTarget?.isEnterprise ? '从源模板重新发布' : '发布为企业模板'}</DialogTitle>
            <DialogDescription>
              {publishTarget?.isEnterprise
                ? '用源模板的最新内容覆盖该企业模板（授权名单不受影响）'
                : '生成一个企业模板（内容取当前快照），发布后可配置授权范围'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="publish-name">企业模板名称</Label>
              <Input
                id="publish-name"
                value={publishName}
                onChange={(event) => setPublishName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>可见范围</Label>
              <div className="flex border rounded-md overflow-hidden w-fit">
                <Button
                  variant={publishVisibility === 'public' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setPublishVisibility('public')}
                >
                  所有用户
                </Button>
                <Button
                  variant={publishVisibility === 'restricted' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setPublishVisibility('restricted')}
                >
                  指定用户和部门
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {publishVisibility === 'restricted'
                  ? '发布后会自动打开「授权设置」，选择可使用的用户或部门'
                  : '所有登录用户都能查看和打印该模板'}
              </p>
            </div>

            {publishError && <p className="text-xs text-destructive">{publishError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishTarget(null)} disabled={isPublishing}>
              取消
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing || !publishName.trim()}>
              {isPublishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {publishTarget?.isEnterprise ? '重新发布' : '发布'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 授权设置 */}
      {adminToken && (
        <TemplateGrantsDialog
          open={!!grantsTarget}
          onOpenChange={(next) => !next && setGrantsTarget(null)}
          adminToken={adminToken}
          template={grantsTarget}
          onSaved={() => fetchTemplates()}
        />
      )}
        </>
      )}
    </div>
  );
}
