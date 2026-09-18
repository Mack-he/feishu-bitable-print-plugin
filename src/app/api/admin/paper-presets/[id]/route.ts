import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { paperPresets } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

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

const ALLOWED_STATUS = ['active', 'disabled'];

/**
 * PATCH /api/admin/paper-presets/[id]
 * 管理员只做启停，不改用户的内容（名称/尺寸仍归创建者所有）
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body?.status || '');
    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'status 只能是 active 或 disabled' }, { status: 400 });
    }

    const [existing] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));
    if (!existing) {
      return NextResponse.json({ error: '纸张不存在' }, { status: 404 });
    }

    await db
      .update(paperPresets)
      .set({ status, updatedAt: new Date() })
      .where(eq(paperPresets.id, id));

    return NextResponse.json({
      success: true,
      data: {
        id,
        name: existing.name,
        widthMm: Number(existing.widthMm),
        heightMm: Number(existing.heightMm),
        isPublic: Boolean(existing.isPublic),
        status,
        userId: existing.userId,
      },
    });
  } catch (error) {
    console.error('[Admin PaperPresets API] 修改纸张状态错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/paper-presets/[id]
 * 删除违规纸张；已引用它的模板按保存时的尺寸快照继续打印
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 });
    }

    const [existing] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));
    if (!existing) {
      return NextResponse.json({ error: '纸张不存在' }, { status: 404 });
    }

    await db.delete(paperPresets).where(eq(paperPresets.id, id));

    return NextResponse.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('[Admin PaperPresets API] 删除纸张错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}