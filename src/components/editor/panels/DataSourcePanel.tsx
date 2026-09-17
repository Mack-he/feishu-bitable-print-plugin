'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { Search, Copy, AlertCircle, Check, FileText, Hash, Calendar, List, Image, User, RefreshCw } from 'lucide-react';
import { Field } from '@/types/editor';
import { toast } from 'sonner';
import { fetchFields, fetchRecords, getCurrentEnvironment } from '@/lib/feishu-service';

interface DataSourcePanelProps {
  onAddField?: (field: Field) => void;
}

// 字段类型图标映射
const fieldTypeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="w-3.5 h-3.5" />,
  number: <Hash className="w-3.5 h-3.5" />,
  date: <Calendar className="w-3.5 h-3.5" />,
  singleSelect: <List className="w-3.5 h-3.5" />,
  multiSelect: <List className="w-3.5 h-3.5" />,
  attachment: <Image className="w-3.5 h-3.5" />,
  user: <User className="w-3.5 h-3.5" />,
  checkbox: <Check className="w-3.5 h-3.5" />,
  url: <FileText className="w-3.5 h-3.5" />,
  phone: <FileText className="w-3.5 h-3.5" />,
  email: <FileText className="w-3.5 h-3.5" />,
  formula: <Hash className="w-3.5 h-3.5" />,
  progress: <Hash className="w-3.5 h-3.5" />,
  currency: <Hash className="w-3.5 h-3.5" />,
  rating: <Hash className="w-3.5 h-3.5" />,
  location: <FileText className="w-3.5 h-3.5" />,
  relation: <FileText className="w-3.5 h-3.5" />,
  group: <FileText className="w-3.5 h-3.5" />,
  barcode: <FileText className="w-3.5 h-3.5" />,
  modifiedTime: <Calendar className="w-3.5 h-3.5" />,
  createdTime: <Calendar className="w-3.5 h-3.5" />,
  modifiedUser: <User className="w-3.5 h-3.5" />,
  createdUser: <User className="w-3.5 h-3.5" />,
  autoNumber: <Hash className="w-3.5 h-3.5" />,
};

export function DataSourcePanel({ onAddField }: DataSourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'field' | 'system'>('field');
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { fields, systemFields, isFeishuEnvironment, setFields, setRecords } = useEditorStore();

  // 过滤字段
  const filteredFields = (activeTab === 'field' ? fields : systemFields).filter(
    (field) => field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // 🔥 【新增】手动刷新字段列表
  const handleRefreshFields = async () => {
    const env = getCurrentEnvironment();
    
    if (env === 'unknown') {
      toast.error('环境未初始化，无法刷新');
      return;
    }
    
    setIsRefreshing(true);
    try {
      // 使用统一的 feishu-service 获取字段（场景：手动刷新）
      const appFields = await fetchFields({ scene: 'manual_refresh' });
      
      setFields(appFields);
      
      // 同时刷新记录
      const records = await fetchRecords({ processFields: true });
      if (records.length > 0) {
        const appRecords = records.map((record, index) => ({
          ...record,
          _rowIndex: index,
        }));
        setRecords(appRecords);
      }
      
      toast.success('字段列表已刷新', {
        description: `共 ${appFields.length} 个字段`,
      });
    } catch (error) {
      console.error('刷新字段失败:', error);
      toast.error('刷新失败', {
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * 兼容 iframe 环境的复制函数
   * 使用 document.execCommand('copy') 替代 navigator.clipboard
   */
  const copyToClipboardLegacy = (text: string) => {
    // 1. 创建临时 textarea 元素
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 2. 样式设置：移出可视区域，避免影响布局
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', ''); // 防止 iOS 键盘弹出
    
    document.body.appendChild(textArea);

    try {
      // 3. 选中内容
      textArea.focus();
      textArea.select();
      
      // 4. 执行复制命令 (同步操作，不受 iframe 策略限制)
      const successful = document.execCommand('copy');
      
      if (successful) {
        // 成功反馈
        return true;
      } else {
        // 命令执行失败
        return false;
      }
    } catch (_err) {
      // 异常捕获
      return false;
    } finally {
      // 5. 清理临时元素
      document.body.removeChild(textArea);
    }
  };

  /**
   * 处理字段点击 - 复制变量字符串到剪贴板
   * 格式: [字段名]
   */
  const handleFieldClick = (field: Field) => {
    // 构造变量字符串 - 统一使用 [字段名] 格式
    const variableToken = `[${field.name}]`;
    
    const success = copyToClipboardLegacy(variableToken);
    
    if (success) {
      // 显示成功状态
      setCopiedFieldId(field.id);
      setTimeout(() => setCopiedFieldId(null), 2000);
      
      // 显示 Toast 提示
      toast.success('已复制字段变量', {
        description: variableToken,
        duration: 2000,
      });
    } else {
      toast.error('复制失败', {
        description: '请手动复制',
      });
    }
  };

  /**
   * 处理复制按钮点击（阻止事件冒泡，仅复制）
   */
  const handleCopyOnly = (e: React.MouseEvent, field: Field) => {
    e.stopPropagation();
    
    const variableToken = `[${field.name}]`;
    const success = copyToClipboardLegacy(variableToken);
    
    if (success) {
      setCopiedFieldId(field.id);
      setTimeout(() => setCopiedFieldId(null), 2000);
      
      toast.success('已复制', {
        description: variableToken,
        duration: 1500,
      });
    } else {
      toast.error('复制失败');
    }
  };

  return (
    <div className="p-3 space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">数据源</h3>
        <span className="text-xs text-muted-foreground">
          {filteredFields.length} 个字段
        </span>
      </div>

      {/* 使用提示 */}
      <div className="bg-muted/50 rounded-lg p-2.5">
        <p className="text-xs text-muted-foreground">
          点击字段复制变量，在文本组件中粘贴使用
        </p>
      </div>

      {/* 非飞书环境提示 */}
      {!isFeishuEnvironment && (
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            当前为演示数据，在飞书多维表格中将显示真实字段
          </p>
        </div>
      )}

      {/* 搜索和刷新 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索字段..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleRefreshFields}
          disabled={isRefreshing || !isFeishuEnvironment}
          title="刷新字段列表"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 标签切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'field' | 'system')}>
        <TabsList className="w-full h-8">
          <TabsTrigger value="field" className="text-xs flex-1">
            字段 ({fields.length})
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs flex-1">
            系统 ({systemFields.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 字段列表 */}
      <div className="space-y-0.5 max-h-72 overflow-y-auto">
        {filteredFields.map((field) => {
          const isCopied = copiedFieldId === field.id;
          const FieldIcon = fieldTypeIcons[field.type] || <FileText className="w-3.5 h-3.5" />;
          
          return (
            <div
              key={field.id}
              className={`
                flex items-center gap-2 p-2 rounded-lg 
                hover:bg-muted cursor-pointer 
                transition-colors duration-150
                ${isCopied ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : ''}
              `}
              onClick={() => handleFieldClick(field)}
              title={`点击复制: [${field.name}]`}
            >
              {/* 字段类型图标 */}
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                {FieldIcon}
              </div>
              
              {/* 字段信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{field.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  [{field.name}]
                </p>
              </div>
              
              {/* 复制状态/按钮 */}
              <div className="shrink-0">
                {isCopied ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">已复制</span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleCopyOnly(e, field)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* 空状态 */}
        {filteredFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">暂无字段</p>
            <p className="text-xs mt-1">
              {searchQuery ? '未找到匹配的字段' : '请在飞书多维表格中使用'}
            </p>
          </div>
        )}
      </div>

      {/* 类型说明 */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">变量使用说明</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>1. 点击字段复制变量（如 <code className="bg-muted px-1 rounded">[字段名]</code>）</p>
          <p>2. 在文本组件中粘贴变量</p>
          <p>3. 打印时变量将被替换为实际数据</p>
        </div>
      </div>
    </div>
  );
}
