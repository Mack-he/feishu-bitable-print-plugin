'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, X } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import type { TemplateGrantEntry } from '@/store/templateStore';

interface DirectoryUser {
  id: number;
  name: string | null;
  avatar: string | null;
}

interface DirectoryDepartment {
  id: number;
  name: string;
  parentFeishuDepartmentId: string | null;
  path: string | null;
  memberCount: number | null;
}

interface SubjectPickerProps {
  value: TemplateGrantEntry[];
  onChange: (next: TemplateGrantEntry[]) => void;
  disabled?: boolean;
}

/**
 * 授权对象选择器：可授权的用户与部门
 * 部门默认「含下级部门」，可在已选标签上单独取消
 */
export function SubjectPicker({ value, onChange, disabled }: SubjectPickerProps) {
  const token = useUserStore((state) => state.token);
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [departments, setDepartments] = useState<DirectoryDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = useCallback(
    async (search: string) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('keyword', search.trim());
        const response = await fetch(`/api/share-directory?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '获取共享目录失败');
        setUsers(result.data.users || []);
        setDepartments(result.data.departments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取共享目录失败');
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchDirectory('');
  }, [fetchDirectory]);

  const selectedKeys = useMemo(
    () => new Set(value.map((entry) => `${entry.subjectType}:${entry.subjectId}`)),
    [value]
  );

  const addUser = (user: DirectoryUser) => {
    const key = `user:${user.id}`;
    if (selectedKeys.has(key)) return;
    onChange([...value, { subjectType: 'user', subjectId: user.id, subjectName: user.name || `用户#${user.id}` }]);
  };

  const addDepartment = (department: DirectoryDepartment) => {
    const key = `department:${department.id}`;
    if (selectedKeys.has(key)) return;
    onChange([
      ...value,
      {
        subjectType: 'department',
        subjectId: department.id,
        includeSubDepartments: true,
        subjectName: department.name,
      },
    ]);
  };

  const removeEntry = (entry: TemplateGrantEntry) => {
    onChange(value.filter((item) => !(item.subjectType === entry.subjectType && item.subjectId === entry.subjectId)));
  };

  const toggleSubDepartments = (entry: TemplateGrantEntry, include: boolean) => {
    onChange(
      value.map((item) =>
        item.subjectType === entry.subjectType && item.subjectId === entry.subjectId
          ? { ...item, includeSubDepartments: include }
          : item
      )
    );
  };

  const departmentDepth = (department: DirectoryDepartment) => {
    const segments = (department.path || '').split(',').filter(Boolean);
    return Math.max(0, segments.length - 1);
  };

  return (
    <div className="space-y-3">
      {/* 已选 */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">已选对象（{value.length}）</Label>
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂未选择任何用户或部门</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {value.map((entry) => (
              <Badge
                key={`${entry.subjectType}:${entry.subjectId}`}
                variant={entry.subjectType === 'department' ? 'secondary' : 'outline'}
                className="gap-1 pr-1"
              >
                {entry.subjectType === 'department' ? '部门' : '用户'}：{entry.subjectName || `#${entry.subjectId}`}
                {entry.subjectType === 'department' && (
                  <label className="ml-1 flex items-center gap-1 cursor-pointer text-[10px]">
                    <Checkbox
                      className="h-3 w-3"
                      checked={entry.includeSubDepartments !== false}
                      disabled={disabled}
                      onCheckedChange={(checked) => toggleSubDepartments(entry, checked === true)}
                    />
                    含下级
                  </label>
                )}
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-destructive/10"
                  disabled={disabled}
                  onClick={() => removeEntry(entry)}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 用户 */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户后回车"
            value={keyword}
            disabled={disabled}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                fetchDirectory(keyword);
              }
            }}
            className="pl-10 h-8"
          />
          {isLoading && <Loader2 className="absolute right-3 top-2 w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <ScrollArea className="h-28 rounded-md border">
          <div className="p-1">
            {users.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">没有匹配的用户</p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={disabled || selectedKeys.has(`user:${user.id}`)}
                  onClick={() => addUser(user)}
                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  {user.name || `用户#${user.id}`}
                  {selectedKeys.has(`user:${user.id}`) && <span className="text-xs text-muted-foreground ml-2">已选</span>}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 部门 */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">部门（默认含下级部门）</Label>
        <ScrollArea className="h-32 rounded-md border">
          <div className="p-1">
            {departments.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">
                暂无部门数据：需要在飞书开放平台开通通讯录权限后，在后台「部门管理」执行同步
              </p>
            ) : (
              departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  disabled={disabled || selectedKeys.has(`department:${department.id}`)}
                  onClick={() => addDepartment(department)}
                  style={{ paddingLeft: `${8 + departmentDepth(department) * 14}px` }}
                  className="w-full text-left text-sm py-1 pr-2 rounded hover:bg-muted disabled:opacity-40"
                >
                  {department.name}
                  {typeof department.memberCount === 'number' && department.memberCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">{department.memberCount} 人</span>
                  )}
                  {selectedKeys.has(`department:${department.id}`) && (
                    <span className="text-xs text-muted-foreground ml-2">已选</span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}