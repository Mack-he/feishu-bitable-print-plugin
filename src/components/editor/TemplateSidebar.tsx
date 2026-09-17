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
} from 'lucide-react';
import { useTemplateStore, UserTemplate } from '@/store/templateStore';
import { useUserStore } from '@/store/userStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TemplateSidebarProps {
  onSelectTemplate?: (template: UserTemplate) => void;
  onCreateNew?: () => void;
  onLogout?: () => void;
  onDeleteAccount?: () => Promise<void>;
}

// 模板项组件
function TemplateItem({ 
  template, 
  isActive, 
  onSelect, 
  onEdit, 
  onDelete 
}: {
  template: UserTemplate;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

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
          <div className="flex items-center justify-between">
            <h4 className={`
              font-medium text-sm truncate
              ${isActive ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {template.name}
            </h4>
            <div className="relative">
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
                <div className="absolute right-0 top-full mt-1 w-32 bg-white border rounded-lg shadow-lg z-10">
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

export function TemplateSidebar({ onSelectTemplate, onCreateNew, onLogout, onDeleteAccount }: TemplateSidebarProps) {
  const { 
    templates, 
    currentTemplate,
    saveTemplate, 
    updateTemplate, 
    deleteTemplate, 
    setCurrentTemplate 
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

  // 移除了频繁的 console.log，避免性能问题

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) || false)
    );
  });

  // 处理创建新模板
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;

    setIsCreatingTemplate(true);
    try {
      await saveTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim() || undefined,
        data: {},
        isPublic: false,
      });

      setNewTemplateName('');
      setNewTemplateDesc('');
      setShowCreateDialog(false);
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
  const handleSelectTemplate = (template: UserTemplate) => {
    console.log('[TemplateSidebar] 选择模板:', template);
    setCurrentTemplate(template);
    onSelectTemplate?.(template);
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">排版打印</h2>
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
              filteredTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isActive={template.id === currentTemplate?.id}
                  onSelect={() => handleSelectTemplate(template)}
                  onEdit={() => openEditDialog(template)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                />
              ))
            )}
          </div>
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
    </>
  );
}
