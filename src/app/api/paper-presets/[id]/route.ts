import { NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { paperPresets } from '@/lib/db/schema';
import {
  authenticate,
  isDuplicateEntryError,
  serializePreset,
  validatePresetPayload,
} from '../_shared';

export const dynamic = 'force-dynamic';

// 修改纸张（仅创建者；公开/尺寸/名称可改）
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const [existing] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));
    if (!existing) {
      return NextResponse.json({ success: false, error: '纸张不存在' }, { status: 404 });
    }
    if (existing.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '无权修改他人的纸张' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 同名校验要排除自己
    const others = await db
      .select({ name: paperPresets.name })
      .from(paperPresets)
      .where(and(eq(paperPresets.userId, auth.userId), ne(paperPresets.id, id)));

    const parsed = validatePresetPayload(
      {
        name: body?.name ?? existing.name,
        widthMm: body?.widthMm ?? existing.widthMm,
        heightMm: body?.heightMm ?? existing.heightMm,
        isPublic: body?.isPublic ?? existing.isPublic,
      },
      others.map((item) => item.name)
    );
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    await db
      .update(paperPresets)
      .set({
        name: parsed.data.name,
        widthMm: String(parsed.data.widthMm),
        heightMm: String(parsed.data.heightMm),
        isPublic: parsed.data.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(paperPresets.id, id));

    const [updated] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));

    return NextResponse.json({
      success: true,
      data: serializePreset(updated, auth.userId),
    });
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json({ success: false, error: '已存在同名纸张' }, { status: 400 });
    }
    console.error('[PaperPresets API] 修改纸张错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存纸张失败' },
      { status: 500 }
    );
  }
}

// 删除纸张（仅创建者）
// 已使用该纸张的模板不受影响：模板 pageConfig 内保存了尺寸快照
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const [existing] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));
    if (!existing) {
      return NextResponse.json({ success: false, error: '纸张不存在' }, { status: 404 });
    }
    if (existing.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '无权删除他人的纸张' },
        { status: 403 }
      );
    }

    await db.delete(paperPresets).where(eq(paperPresets.id, id));

    return NextResponse.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('[PaperPresets API] 删除纸张错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除纸张失败' },
      { status: 500 }
    );
  }
}