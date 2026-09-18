import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { canUseTemplate } from '@/lib/template-access';
import { loadAccessSubject, loadGrantsForTemplate } from '@/lib/template-access-server';
import { authenticate, serializeTemplate } from '../../_shared';

export const dynamic = 'force-dynamic';

/**
 * 复制为我的模板
 * 只要当前用户「可见」该模板（自己的 / 公开的 / 被授权的 / 企业模板）即可复制一份到自己名下再修改
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

    const [source] = await db.select().from(templates).where(eq(templates.id, templateId));
    if (!source) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    const [subject, grants] = await Promise.all([
      loadAccessSubject(auth.userId),
      loadGrantsForTemplate(templateId),
    ]);
    const access = canUseTemplate(source, subject, grants);

    if (!access.canCopy) {
      return NextResponse.json(
        {
          success: false,
          error:
            access.reason === 'disabled'
              ? '该模板已被停用，无法复制'
              : '未被授权使用该模板，无法复制',
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const [{ id }] = await db
      .insert(templates)
      .values({
        userId: auth.userId,
        name: `${source.name}-副本`,
        description: source.description,
        thumbnail: source.thumbnail,
        data: source.data,
        isPublic: false,
        visibility: 'private',
        status: 'active',
        sourceTemplateId: source.id,
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();

    const [created] = await db.select().from(templates).where(eq(templates.id, id));

    return NextResponse.json({
      success: true,
      data: serializeTemplate(
        created,
        { isOwner: true, isEnterprise: false, canView: true, canPrint: true, canEdit: true, canCopy: true },
        { source: 'mine' }
      ),
    });
  } catch (error) {
    console.error('[Template API] 复制模板错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '复制模板失败' },
      { status: 500 }
    );
  }
}