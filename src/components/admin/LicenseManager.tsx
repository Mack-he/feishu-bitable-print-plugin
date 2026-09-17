'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Key,
  CheckCircle,
  AlertCircle,
  Download,
  Search,
  Eye,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LICENSE_DURATIONS, type LicenseType, formatLicenseCode } from '@/lib/license-utils';

interface License {
  id: number;
  code: string;
  code_formatted?: string;
  type: LicenseType;
  duration_days: number;
  status: 'unused' | 'active' | 'expired' | 'revoked';
  note?: string;
  created_by: string;
  created_at: string;
  bound_user_id?: string;
  bound_user_name?: string;
  bound_at?: string;
  valid_until?: string;
  days_remaining?: number;
  is_expired?: boolean;
}

interface LicenseStats {
  status: {
    total: number;
    unused: number;
    active: number;
    expired: number;
    revoked: number;
  };
  type: Record<string, number>;
  today: number;
  dailyTrend: { date: string; count: number }[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface LicenseManagerProps {
  adminToken: string;
}

/**
 * 管理员授权码管理面板
 */
export function LicenseManager({ adminToken }: LicenseManagerProps) {
  // 列表状态
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 筛选和搜索状态
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 分页状态
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  
  // 统计状态
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  
  // 生成授权码表单状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateType, setGenerateType] = useState<LicenseType>('month');
  const [generatePrefix, setGeneratePrefix] = useState('');
  const [generateNote, setGenerateNote] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // 详情弹窗状态
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 加载授权码列表
  const loadLicenses = useCallback(async (page: number = pagination.page) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/admin/licenses', window.location.origin);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('pageSize', pagination.pageSize.toString());
      
      if (filterStatus !== 'all') {
        url.searchParams.set('status', filterStatus);
      }
      
      if (filterType !== 'all') {
        url.searchParams.set('type', filterType);
      }
      
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '加载失败');
      }
      
      setLicenses(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('[LicenseManager] 加载授权码失败:', err);
      setError(err instanceof Error ? err.message : '加载授权码列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, filterStatus, filterType, searchQuery, pagination.pageSize]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);
    
    try {
      const response = await fetch('/api/admin/licenses/stats', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '加载统计失败');
      }
      
      setStats(result.data);
    } catch (err) {
      console.error('[LicenseManager] 加载统计数据失败:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [adminToken]);

  // 初始加载
  useEffect(() => {
    loadLicenses();
    loadStats();
  }, [loadLicenses, loadStats]);

  // 生成授权码
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          count: generateCount,
          type: generateType,
          prefix: generatePrefix,
          note: generateNote,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }
      
      setGeneratedCodes(result.data.codes);
      loadLicenses(); // 刷新列表
      loadStats(); // 刷新统计
    } catch (err) {
      console.error('[LicenseManager] 生成授权码失败:', err);
      setError(err instanceof Error ? err.message : '生成授权码失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 作废授权码
  const handleRevoke = async (id: number) => {
    if (!confirm('确定要作废此授权码吗？')) return;
    
    try {
      const response = await fetch(`/api/admin/licenses?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '作废失败');
      }
      
      loadLicenses(); // 刷新列表
      loadStats(); // 刷新统计
    } catch (err) {
      console.error('[LicenseManager] 作废授权码失败:', err);
      setError(err instanceof Error ? err.message : '作废授权码失败');
    }
  };

  // 删除授权码（物理删除，仅适用于已作废/过期的授权码）
  const handleDelete = async (id: number) => {
    if (!confirm('确定要永久删除此授权码吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(`/api/admin/licenses?id=${id}&force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '删除失败');
      }
      
      loadLicenses(); // 刷新列表
      loadStats(); // 刷新统计
    } catch (err) {
      console.error('[LicenseManager] 删除授权码失败:', err);
      setError(err instanceof Error ? err.message : '删除授权码失败');
    }
  };

  // 复制到剪贴板
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    // 可以添加 toast 提示
  };

  // 复制所有生成的授权码
  const handleCopyAll = () => {
    if (generatedCodes.length === 0) return;
    navigator.clipboard.writeText(generatedCodes.join('\n'));
  };

  // 导出授权码
  const handleExport = () => {
    const unusedLicenses = licenses.filter(l => l.status === 'unused');
    const content = unusedLicenses.map(l => formatLicenseCode(l.code)).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `授权码列表_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 查看详情
  const handleViewDetail = async (license: License) => {
    try {
      const response = await fetch(`/api/admin/licenses/${license.id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '获取详情失败');
      }
      
      setSelectedLicense(result.data);
      setShowDetailDialog(true);
    } catch (err) {
      console.error('[LicenseManager] 获取授权码详情失败:', err);
      setError(err instanceof Error ? err.message : '获取授权码详情失败');
    }
  };

  // 获取状态显示
  const getStatusBadge = (status: string, isExpired?: boolean) => {
    const styles: Record<string, string> = {
      unused: 'bg-gray-100 text-gray-700 border-gray-300',
      active: 'bg-green-100 text-green-700 border-green-300',
      expired: 'bg-red-100 text-red-700 border-red-300',
      revoked: 'bg-orange-100 text-orange-700 border-orange-300',
    };
    
    const labels: Record<string, string> = {
      unused: '未使用',
      active: '使用中',
      expired: '已过期',
      revoked: '已作废',
    };
    
    return (
      <Badge variant="outline" className={cn(styles[status] || styles.unused)}>
        {labels[status] || status}
      </Badge>
    );
  };

  // 获取类型标签
  const getTypeLabel = (type: LicenseType) => {
    const duration = LICENSE_DURATIONS.find(d => d.type === type);
    return duration?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>总授权码</CardDescription>
            <CardTitle className="text-2xl">
              {isStatsLoading ? <Spinner className="h-5 w-5" /> : stats?.status.total || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>未使用</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {isStatsLoading ? <Spinner className="h-5 w-5" /> : stats?.status.unused || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>使用中</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {isStatsLoading ? <Spinner className="h-5 w-5" /> : stats?.status.active || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>今日生成</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              {isStatsLoading ? <Spinner className="h-5 w-5" /> : stats?.today || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 操作栏 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            授权码管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 筛选和搜索 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label>状态:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="unused">未使用</SelectItem>
                  <SelectItem value="active">使用中</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                  <SelectItem value="revoked">已作废</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>类型:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {LICENSE_DURATIONS.map(d => (
                    <SelectItem key={d.type} value={d.type}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索授权码、用户ID或用户名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => e.key === 'Enter' && loadLicenses(1)}
                />
              </div>
            </div>
            
            <Button variant="outline" onClick={() => loadLicenses(1)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              生成授权码
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              导出未使用
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 授权码列表 */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>授权码</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>绑定用户</TableHead>
                  <TableHead>飞书ID</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Spinner className="mx-auto h-6 w-6" />
                    </TableCell>
                  </TableRow>
                ) : licenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      暂无授权码数据
                    </TableCell>
                  </TableRow>
                ) : (
                  licenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell>{license.id}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {license.code_formatted || formatLicenseCode(license.code)}
                      </TableCell>
                      <TableCell>{getTypeLabel(license.type)}</TableCell>
                      <TableCell>
                        {getStatusBadge(license.status, license.is_expired)}
                      </TableCell>
                      <TableCell>
                        {license.bound_user_name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {license.bound_user_id ? (
                          <div className="max-w-[150px] truncate" title={license.bound_user_id}>
                            {license.bound_user_id}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {license.valid_until ? (
                          <span className={cn(
                            license.days_remaining != null && license.days_remaining <= 7 && license.days_remaining > 0 && 'text-orange-600',
                            license.days_remaining != null && license.days_remaining <= 0 && 'text-red-600'
                          )}>
                            {new Date(license.valid_until).toLocaleDateString('zh-CN')}
                            {license.days_remaining != null && (
                              <span className="text-xs ml-1">
                                ({license.days_remaining > 0 ? `剩${license.days_remaining}天` : '已过期'})
                              </span>
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(license.created_at).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(license)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(license.code_formatted || formatLicenseCode(license.code))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {/* 未作废的授权码显示作废按钮 */}
                          {license.status !== 'revoked' && license.status !== 'expired' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(license.id)}
                              className="text-orange-600 hover:text-orange-700"
                              title="作废"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {/* 已作废或过期的授权码显示永久删除按钮 */}
                          {(license.status === 'revoked' || license.status === 'expired') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(license.id)}
                              className="text-red-600 hover:text-red-700"
                              title="永久删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLicenses(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLicenses(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 生成授权码弹窗 */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>生成授权码</DialogTitle>
            <DialogDescription>
              批量生成新的授权码
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>生成数量</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">一次最多生成 100 个</p>
            </div>
            
            <div className="space-y-2">
              <Label>有效期类型</Label>
              <Select value={generateType} onValueChange={(v) => setGenerateType(v as LicenseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_DURATIONS.map(d => (
                    <SelectItem key={d.type} value={d.type}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>前缀（可选）</Label>
              <Input
                placeholder="如: VIP"
                value={generatePrefix}
                onChange={(e) => setGeneratePrefix(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>
            
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Input
                placeholder="授权码用途说明"
                value={generateNote}
                onChange={(e) => setGenerateNote(e.target.value)}
              />
            </div>

            {generatedCodes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>生成的授权码</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopyAll}>
                    <Copy className="h-4 w-4 mr-1" />
                    复制全部
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-muted">
                  {generatedCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm py-1">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              关闭
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  生成
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>授权码详情</DialogTitle>
          </DialogHeader>
          
          {selectedLicense && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-medium">{selectedLicense.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <p>{getStatusBadge(selectedLicense.status, selectedLicense.is_expired)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">授权码</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded font-mono">
                    {selectedLicense.code_formatted || formatLicenseCode(selectedLicense.code)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(selectedLicense.code_formatted || formatLicenseCode(selectedLicense.code))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">类型</Label>
                  <p className="font-medium">{getTypeLabel(selectedLicense.type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">有效天数</Label>
                  <p className="font-medium">{selectedLicense.duration_days} 天</p>
                </div>
              </div>
              
              {selectedLicense.note && (
                <div>
                  <Label className="text-muted-foreground">备注</Label>
                  <p className="font-medium">{selectedLicense.note}</p>
                </div>
              )}
              
              {selectedLicense.bound_user_id && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">绑定用户</Label>
                      <p className="font-medium">{selectedLicense.bound_user_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">飞书ID</Label>
                      <p className="font-medium text-xs break-all">{selectedLicense.bound_user_id}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">绑定时间</Label>
                    <p className="font-medium">
                      {selectedLicense.bound_at ? new Date(selectedLicense.bound_at).toLocaleString('zh-CN') : '-'}
                    </p>
                  </div>
                </>
              )}
              
              {selectedLicense.valid_until && (
                <div>
                  <Label className="text-muted-foreground">到期时间</Label>
                  <p className={cn(
                    'font-medium',
                    selectedLicense.days_remaining != null && selectedLicense.days_remaining <= 7 && selectedLicense.days_remaining > 0 && 'text-orange-600',
                    selectedLicense.days_remaining != null && selectedLicense.days_remaining <= 0 && 'text-red-600'
                  )}>
                    {new Date(selectedLicense.valid_until).toLocaleString('zh-CN')}
                    {selectedLicense.days_remaining != null && (
                      <span className="ml-2">
                        ({selectedLicense.days_remaining > 0 ? `剩余 ${selectedLicense.days_remaining} 天` : '已过期'})
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">创建时间</Label>
                <p className="font-medium">{new Date(selectedLicense.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LicenseManager;
