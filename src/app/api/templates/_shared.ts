import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { TemplateAccess } from '@/lib/template-access';
import type { TemplateRow, TemplateSource } from '@/lib/template-access-server';

/**
 * 模板接口共用逻辑
 * 权限模型见 src/lib/template-access.ts：private / public / restricted + status(active|disabled)，
 * userId 为 NULL 表示企业模板（管理员发布）。
 */

export function authenticate(request: Request): { userId: number } | { error: NextResponse } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ success: false, error: '未授权' }, { status: 401 }) };
  }

  const decoded = verifyToken(authHeader.substring(7));
  if (!decoded) {
    return { error: NextResponse.json({ success: false, error: '登录已过期' }, { status: 401 }) };
  }

  return { userId: decoded.userId };
}

export interface SerializedTemplate {
  id: number;
  userId: number | null;
  name: string;
  description: string | null;
  thumbnail: string | null;
  data: unknown;
  visibility: string;
  status: string;
  source: TemplateSource;
  isOwner: boolean;
  isEnterprise: boolean;
  canEdit: boolean;
  canPrint: boolean;
  canCopy: boolean;
  ownerName?: string | null;
  publishRequestStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeTemplate(
  template: TemplateRow,
  access: TemplateAccess,
  options: { source?: TemplateSource; ownerName?: string | null; publishRequestStatus?: string | null } = {}
): SerializedTemplate {
  return {
    id: template.id,
    userId: template.userId,
    name: template.name,
    description: template.description,
    thumbnail: template.thumbnail,
    data: template.data,
    visibility: template.visibility,
    status: template.status,
    source: options.source ?? (access.isOwner ? 'mine' : access.isEnterprise ? 'enterprise' : 'shared'),
    isOwner: access.isOwner,
    isEnterprise: access.isEnterprise,
    canEdit: access.canEdit,
    canPrint: access.canPrint,
    canCopy: access.canCopy,
    ownerName: options.ownerName ?? null,
    publishRequestStatus: options.publishRequestStatus ?? null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

