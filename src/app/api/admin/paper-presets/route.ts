import { NextResponse } from 'next/server';
import { and, count, desc, eq, isNull, like, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { paperPresets, users } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth/jwt';
import { isDuplicateEntryError, validatePresetPayload } from '../../paper-presets/_shared';

export const dynamic = 'force-dynamic';

/**
 * 验证管理员权限（与 admin/licenses 保持一致的写法）
 */
async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: '未授权', status: 401 };
  }

  const decoded = verifyToken(authHeader.substring(7));
  if (!decoded) {
    return { error: 'Token 无效', status: 401 };
  }
  if (decoded.type !== 'admin') {
    return { error: '无管理员权限', status: 403 };
  }

  return { adminId: (decoded as any).adminId || (decoded as any).userId };
}

/**
 * GET /api/admin/paper-presets
 * 全部用户的自定义纸张（分页 + 关键词/状态筛选），仅管理员可见
 */
export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    const conditions = [];
    if (keyword) {
      conditions.push(or(like(paperPresets.name, `%${keyword}%`), like(users.name, `%${keyword}%`)));
    }
    if (status && status !== 'all') {
      conditions.push(eq(paperPresets.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(paperPresets)
      .leftJoin(users, eq(users.id, paperPresets.userId))
      .where(where);

    const rows = await db
      .select({
        preset: paperPresets,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(paperPresets)
      .leftJoin(users, eq(users.id, paperPresets.userId))
      .where(where)
      .orderBy(desc(paperPresets.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.preset.id,
        name: row.preset.name,
        widthMm: Number(row.preset.widthMm),
        heightMm: Number(row.preset.heightMm),
        isPublic: Boolean(row.preset.isPublic),
        status: row.preset.status,
        userId: row.preset.userId,
        isSystem: row.preset.userId === null,
        ownerName: row.ownerName,
        ownerEmail: row.ownerEmail,
        createdAt: row.preset.createdAt,
        updatedAt: row.preset.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[Admin PaperPresets API] 获取纸张列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取纸张列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/paper-presets
 * 管理员新建「系统纸张」：userId 为 NULL，对所有用户可见可用（用户只读，不能改删）
 */
export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    // 系统纸张的唯一性要在应用层校验：MySQL 唯一索引 (user_id, name) 对 NULL 不去重
    const existing = await db
      .select({ name: paperPresets.name })
      .from(paperPresets)
      .where(isNull(paperPresets.userId));

    const parsed = validatePresetPayload(body, existing.map((item) => item.name));
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const now = new Date();
    const [{ id }] = await db
      .insert(paperPresets)
      .values({
        userId: null,
        name: parsed.data.name,
        widthMm: String(parsed.data.widthMm),
        heightMm: String(parsed.data.heightMm),
        // 系统纸张天然是共享的
        isPublic: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();

    const [created] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        name: created.name,
        widthMm: Number(created.widthMm),
        heightMm: Number(created.heightMm),
        isPublic: Boolean(created.isPublic),
        status: created.status,
        userId: null,
        isSystem: true,
        ownerName: null,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json({ error: '已存在同名纸张' }, { status: 400 });
    }
    console.error('[Admin PaperPresets API] 新建系统纸张错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '新建纸张失败' },
      { status: 500 }
    );
  }
}