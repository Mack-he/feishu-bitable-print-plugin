import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { templatePublishRequests, templates } from '@/lib/db/schema';
import { authenticate } from '../../_shared';

export const dynamic = 'force-dynamic';

/**
 * 申请把模板发布为企业模板（管理员在后台审批）
 * 仅模板创建者可以申请；同一模板已有待审核申请时不重复提交
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { id: rawId } = await context.params;
    const templateId = Number(rawId);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
    if (!template) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }
    if (template.userId !== auth.userId) {
      return NextResponse.json({ success: false, error: '只能申请发布自己的模板' }, { status: 403 });
    }

    const [pending] = await db
      .select()
      .from(templatePublishRequests)
      .where(
        and(
          eq(templatePublishRequests.templateId, templateId),
          eq(templatePublishRequests.status, 'pending')
        )
      )
      .orderBy(desc(templatePublishRequests.createdAt));

    if (pending) {
      return NextResponse.json({ success: false, error: '该模板已有待审核的发布申请' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null;
    const now = new Date();

    const [{ id }] = await db
      .insert(templatePublishRequests)
      .values({
        templateId,
        applicantUserId: auth.userId,
        note,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();

    const [created] = await db
      .select()
      .from(templatePublishRequests)
      .where(eq(templatePublishRequests.id, id));

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('[PublishRequest API] 提交发布申请错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '提交发布申请失败' },
      { status: 500 }
    );
  }
}