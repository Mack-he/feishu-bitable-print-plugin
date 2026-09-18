import { NextResponse } from 'next/server';
import { and, asc, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { paperPresets, users } from '@/lib/db/schema';
import {
  authenticate,
  isDuplicateEntryError,
  serializePreset,
  validatePresetPayload,
} from './_shared';

export const dynamic = 'force-dynamic';

// 获取纸张列表：自己的全部 + 他人公开且未停用的
export async function GET(request: Request) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const rows = await db
      .select({
        preset: paperPresets,
        ownerName: users.name,
      })
      .from(paperPresets)
      .leftJoin(users, eq(users.id, paperPresets.userId))
      .where(
        or(
          eq(paperPresets.userId, auth.userId),
          and(eq(paperPresets.isPublic, true), eq(paperPresets.status, 'active'))
        )
      )
      .orderBy(asc(paperPresets.name));

    return NextResponse.json({
      success: true,
      data: rows.map((row) => serializePreset(row.preset, auth.userId, row.ownerName)),
    });
  } catch (error) {
    console.error('[PaperPresets API] 获取纸张列表错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取纸张列表失败' },
      { status: 500 }
    );
  }
}

// 新建自定义纸张
export async function POST(request: Request) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();

    const owned = await db
      .select({ name: paperPresets.name })
      .from(paperPresets)
      .where(eq(paperPresets.userId, auth.userId));

    const parsed = validatePresetPayload(body, owned.map((item) => item.name));
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const now = new Date();
    const [{ id }] = await db
      .insert(paperPresets)
      .values({
        userId: auth.userId,
        name: parsed.data.name,
        widthMm: String(parsed.data.widthMm),
        heightMm: String(parsed.data.heightMm),
        isPublic: parsed.data.isPublic,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();

    const [created] = await db.select().from(paperPresets).where(eq(paperPresets.id, id));

    return NextResponse.json({
      success: true,
      data: serializePreset(created, auth.userId),
    });
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json({ success: false, error: '已存在同名纸张' }, { status: 400 });
    }
    console.error('[PaperPresets API] 创建纸张错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建纸张失败' },
      { status: 500 }
    );
  }
}