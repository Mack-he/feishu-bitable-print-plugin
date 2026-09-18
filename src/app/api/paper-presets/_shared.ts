import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { PAPER_MAX_MM, PAPER_MIN_MM, isValidPaperMm, normalizePaperDims, validatePaperName } from '@/lib/paper';

/**
 * 纸张预设接口的共用逻辑
 * 权限规则：默认仅创建者可见可用；is_public = 1 时其他用户可见可用（只读）；
 *          status = 'disabled' 由管理员停用，普通用户端不参与选择。
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

export interface PaperPresetRow {
  id: number;
  userId: number | null;
  name: string;
  widthMm: string | number;
  heightMm: string | number;
  isPublic: boolean | null;
  status: string;
}

export interface SerializedPaperPreset {
  id: number;
  name: string;
  widthMm: number;
  heightMm: number;
  isPublic: boolean;
  status: string;
  isOwner: boolean;
  /** 系统纸张（管理员创建，userId 为 NULL），对所有用户可见可用 */
  isSystem: boolean;
  ownerName: string | null;
}

/** DECIMAL 列在 mysql2 下是字符串，这里统一归一为数字 */
export function serializePreset(row: PaperPresetRow, viewerId: number, ownerName?: string | null): SerializedPaperPreset {
  return {
    id: row.id,
    name: row.name,
    widthMm: Number(row.widthMm),
    heightMm: Number(row.heightMm),
    isPublic: Boolean(row.isPublic),
    status: row.status,
    isOwner: row.userId === viewerId,
    isSystem: row.userId === null,
    ownerName: ownerName ?? null,
  };
}

export interface PaperPresetPayload {
  name: string;
  widthMm: number;
  heightMm: number;
  isPublic: boolean;
}

/**
 * 校验并归一化请求体。
 * 尺寸统一按纵向基准存储（宽 > 高时自动交换），与内置纸张保持同一不变量。
 */
export function validatePresetPayload(
  body: any,
  existingNames: string[] = []
): { data: PaperPresetPayload } | { error: string } {
  const nameError = validatePaperName(String(body?.name ?? ''), existingNames);
  if (nameError) return { error: nameError };

  const width = Number(body?.widthMm);
  const height = Number(body?.heightMm);
  if (!isValidPaperMm(width) || !isValidPaperMm(height)) {
    return { error: `纸张尺寸需在 ${PAPER_MIN_MM}~${PAPER_MAX_MM} mm 之间` };
  }

  const normalized = normalizePaperDims(width, height);

  return {
    data: {
      name: String(body.name).trim(),
      widthMm: normalized.width,
      heightMm: normalized.height,
      isPublic: Boolean(body?.isPublic),
    },
  };
}

/** 唯一索引冲突（并发下同名）转换为友好提示 */
export function isDuplicateEntryError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'ER_DUP_ENTRY';
}