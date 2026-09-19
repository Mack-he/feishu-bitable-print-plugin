'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  FileText,
  Folder,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Search,
  LogOut,
  Loader2,
  Share2,
  Upload,
  Copy,
} from 'lucide-react';
import { useTemplateStore, UserTemplate } from '@/store/templateStore';
import { ShareSettingsDialog } from './dialogs/ShareSettingsDialog';
import { useUserStore } from '@/store/userStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TemplateSidebarProps {
  onSelectTemplate?: (template: UserTemplate) => void;
  onCreateNew?: () => void;
  onTemplateCreated?: (template: UserTemplate) => void;
  onLogout?: () => void;
  onDeleteAccount?: () => Promise<void>;
}

// 模板来源徽标
function SourceBadge({ template }: { template: UserTemplate }) {
  if (template.isEnterprise) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-purple-50 text-purple-600 border border-purple-200">
        企业模板
      </span>
    );
  }
  if (template.source === 'shared') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
        共享给我
      </span>
    );
  }
  if (template.status === 'disabled') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200">
        已停用
      </span>
    );
  }
  if (template.visibility === 'public') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 border border-blue-200">
        所有用户
      </span>
    );
  }
  if (template.visibility === 'restricted') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200">
        指定授权
      </span>
    );
  }
  return null;
}

// 模板项组件
function TemplateItem({ 
  template, 
  isActive, 
  onSelect, 
  onEdit, 
  onDelete,
  onShare,
  onCopy,
  onRequestPublish,
}: {
  template: UserTemplate;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  onRequestPublish?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = template.isOwner !== false && !template.isEnterprise;

  return (
    <div 
      className={`
        group relative p-3 rounded-lg cursor-pointer transition-all
        ${isActive 
          ? 'bg-blue-50 border border-blue-200' 
          : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
        `}>
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className={`
              font-medium text-sm truncate
              ${isActive ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {template.name}
            </h4>
            <div className="relative flex items-center gap-1 flex-shrink-0">
              <SourceBadge template={template} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                  {isOwner ? (
                    <>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                          setShowMenu(false);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                        编辑
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare?.();
                          setShowMenu(false);
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        共享设置
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                        disabled={template.publishRequestStatus === 'pending'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestPublish?.();
                          setShowMenu(false);
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        {template.publishRequestStatus === 'pending' ? '发布申请审核中' : '申请发布为企业模板'}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                          setShowMenu(false);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                    </>
                  ) : (
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy?.();
                        setShowMenu(false);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      复制为我的模板
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {template.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {isActive && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                <CheckCircle2 className="w-3 h-3" />
                使用中
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(template.updatedAt), { 
                addSuffix: true,
                locale: zhCN 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateSidebar({ onSelectTemplate, onCreateNew, onTemplateCreated, onLogout, onDeleteAccount }: TemplateSidebarProps) {
  const {
    templates,
    currentTemplate,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    setCurrentTemplate,
    fetchTemplates,
    currentPage,
    totalPages,
    totalCount,
  } = useTemplateStore();
  
  const { user } = useUserStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  // 共享设置 / 申请发布
  const [shareTemplate, setShareTemplate] = useState<UserTemplate | null>(null);
  const [publishTarget, setPublishTarget] = useState<UserTemplate | null>(null);
  const [publishNote, setPublishNote] = useState('');
  const [isSubmittingPublish, setIsSubmittingPublish] = useState(false);

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) || false)
    );
  });

  // 按来源分组展示：我的模板 / 企业模板 / 共享给我
  const myTemplates = filteredTemplates.filter((t) => t.source === 'mine' || (!t.source && !t.isEnterprise));
  const enterpriseTemplates = filteredTemplates.filter((t) => t.source === 'enterprise' || t.isEnterprise);
  const sharedTemplates = filteredTemplates.filter((t) => t.source === 'shared');

  const templateGroups = [
    { key: 'mine', label: '我的模板', items: myTemplates },
    { key: 'enterprise', label: '企业模板', items: enterpriseTemplates },
    { key: 'shared', label: '共享给我', items: sharedTemplates },
  ].filter((group) => group.items.length > 0);

  // 复制非本人模板为我的模板
  const handleCopyTemplate = async (template: UserTemplate) => {
    try {
      const created = await useTemplateStore.getState().copyTemplate(template.id);
      setCurrentTemplate(created);
      onTemplateCreated?.(created);
    } catch (error) {
      alert(error instanceof Error ? error.message : '复制模板失败');
    }
  };

  // 提交企业模板发布申请
  const handleSubmitPublish = async () => {
    if (!publishTarget) return;
    setIsSubmittingPublish(true);
    try {
      await useTemplateStore.getState().requestPublish(publishTarget.id, publishNote);
      setPublishTarget(null);
      setPublishNote('');
      alert('已提交发布申请，等待管理员审核');
    } catch (error) {
      alert(error instanceof Error ? error.message : '提交申请失败');
    } finally {
      setIsSubmittingPublish(false);
    }
  };

  // 处理创建新模板
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;

    setIsCreatingTemplate(true);
    try {
      const newTemplate = await saveTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim() || undefined,
        data: {},
        isPublic: false,
      });

      // 设置当前模板并通知父组件跳转到编辑器
      setCurrentTemplate(newTemplate);
      setNewTemplateName('');
      setNewTemplateDesc('');
      setShowCreateDialog(false);
      onTemplateCreated?.(newTemplate);
    } catch (error) {
      console.error('[TemplateSidebar] 创建模板失败:', error);
      alert('创建模板失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  // 处理编辑模板
  const handleEditTemplate = () => {
    if (!editingTemplate || !newTemplateName.trim()) return;

    updateTemplate(editingTemplate.id, {
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || undefined,
    });

    setEditingTemplate(null);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setShowEditDialog(false);
  };

  // 处理删除模板
  const handleDeleteTemplate = (id: number) => {
    setDeleteTemplateId(id);
    setShowDeleteTemplateDialog(true);
  };

  // 确认删除模板
  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    
    setIsDeletingTemplate(true);
    try {
      console.log('[TemplateSidebar] 确认删除模板:', deleteTemplateId);
      await deleteTemplate(deleteTemplateId);
      setShowDeleteTemplateDialog(false);
      setDeleteTemplateId(null);
    } catch (error) {
      console.error('[TemplateSidebar] 删除模板失败:', error);
      // 显示更友好的错误提示
      alert(error instanceof Error ? error.message : '删除模板失败，请刷新页面重试');
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  // 处理选择模板
  const handleSelectTemplate = async (template: UserTemplate) => {
    try {
      const fullTemplate = await useTemplateStore.getState().loadTemplateById(template.id);
      onSelectTemplate?.(fullTemplate);
    } catch (error) {
      console.error('[TemplateSidebar] 加载模板失败:', error);
      alert(error instanceof Error ? error.message : '加载模板失败');
    }
  };

  // 打开编辑对话框
  const openEditDialog = (template: UserTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateDesc(template.description || '');
    setShowEditDialog(true);
  };

  return (
    <>
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-gray-200">
          <div className="mb-4">
            <img src="/logo.png" alt="双鲸药业" className="h-8 w-auto mb-1.5" />
            <h2 className="text-sm font-semibold text-gray-900">多维表格自定义打印</h2>
            <p className="text-xs text-gray-500 mt-0.5">飞书多维表格打印插件</p>
          </div>

          {/* 创建模板按钮 */}
          <Button 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => {
              setNewTemplateName('');
              setNewTemplateDesc('');
              setShowCreateDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            创建排版
          </Button>
        </div>

        {/* 模板管理区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700">模板管理</h3>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>

          {/* 模板列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? '没有找到匹配的模板' : '还没有创建模板'}
                </p>
              </div>
            ) : (
              templateGroups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 px-1 pt-1">
                    {group.label}（{group.items.length}）
                  </p>
                  {group.items.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      isActive={template.id === currentTemplate?.id}
                      onSelect={() => handleSelectTemplate(template)}
                      onEdit={() => openEditDialog(template)}
                      onDelete={() => handleDeleteTemplate(template.id)}
                      onShare={() => setShareTemplate(template)}
                      onCopy={() => handleCopyTemplate(template)}
                      onRequestPublish={() => {
                        setPublishTarget(template);
                        setPublishNote('');
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && !searchQuery && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">共 {totalCount} 条</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchTemplates(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="text-xs text-gray-600">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => fetchTemplates(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部区域 - 显示用户信息 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name || '用户'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteAccountDialog(true)} 
                  className="text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除账号
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 创建模板对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建新模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">模板名称</Label>
              <Input
                id="templateName"
                placeholder="请输入模板名称"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDesc">模板描述（可选）</Label>
              <Textarea
                id="templateDesc"
                placeholder="请输入模板描述"
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={!newTemplateName.trim() || isCreatingTemplate}
            >
              {isCreatingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑模板对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTemplateName">模板名称</Label>
              <Input
                id="editTemplateName"
                placeholder="请输入模板名称"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTemplateDesc">模板描述（可选）</Label>
              <Textarea
                id="editTemplateDesc"
                placeholder="请输入模板描述"
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleEditTemplate}
              disabled={!newTemplateName.trim()}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 删除账号确认对话框 */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              警告：删除账号
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="text-gray-700 font-medium">
                此操作将永久删除您的账号信息，包括：
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                <li>飞书登录信息</li>
                <li>所有授权码绑定记录</li>
                <li>个人设置和偏好</li>
              </ul>
              <p className="text-red-500 text-sm mt-2">
                删除后，您需要重新登录并绑定授权码才能继续使用。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>
              暂不删除
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (onDeleteAccount) {
                  setIsDeletingAccount(true);
                  try {
                    await onDeleteAccount();
                  } finally {
                    setIsDeletingAccount(false);
                    setShowDeleteAccountDialog(false);
                  }
                }
              }}
              disabled={isDeletingAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingAccount ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  同意删除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 删除模板确认对话框 */}
      <AlertDialog open={showDeleteTemplateDialog} onOpenChange={setShowDeleteTemplateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              确认删除模板
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个模板吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTemplate}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              disabled={isDeletingTemplate}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingTemplate ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  确认删除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 共享设置 */}
      <ShareSettingsDialog
        open={!!shareTemplate}
        onOpenChange={(next) => !next && setShareTemplate(null)}
        template={shareTemplate}
        onSaved={() => {
          useTemplateStore.getState().fetchTemplates().catch(() => {});
        }}
      />

      {/* 申请发布为企业模板 */}
      <Dialog open={!!publishTarget} onOpenChange={(next) => !next && setPublishTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>申请发布为企业模板</DialogTitle>
            <DialogDescription>
              管理员审核通过后，该模板会成为企业模板并可按用户/部门配置授权；内容更新后可再次联系管理员重新发布
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              模板：<span className="font-medium">{publishTarget?.name}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="publish-note">申请说明（可选）</Label>
              <Textarea
                id="publish-note"
                rows={3}
                value={publishNote}
                placeholder="例如：集团统一使用的报销单模板，需要给财务部使用"
                onChange={(event) => setPublishNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishTarget(null)} disabled={isSubmittingPublish}>
              取消
            </Button>
            <Button onClick={handleSubmitPublish} disabled={isSubmittingPublish}>
              {isSubmittingPublish ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
