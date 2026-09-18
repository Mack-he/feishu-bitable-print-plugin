import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { canUseTemplate } from '@/lib/template-access';
import { loadAccessSubject, loadGrantsForTemplate } from '@/lib/template-access-server';
import { authenticate, serializeTemplate } from '../_shared';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// 获取单个模板（按可见性/授权判定）
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { id: rawId } = await context.params;
    const templateId = parseId(rawId);
    if (templateId === null) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
    if (!template) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    const [subject, grants] = await Promise.all([
      loadAccessSubject(auth.userId),
      loadGrantsForTemplate(templateId),
    ]);
    const access = canUseTemplate(template, subject, grants);

    if (!access.canView) {
      return NextResponse.json(
        {
          success: false,
          error:
            access.reason === 'disabled'
              ? '该模板已被停用'
              : access.reason === 'not-granted'
                ? '未被授权使用该模板'
                : '无权访问此模板',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: serializeTemplate(template, access) });
  } catch (error) {
    console.error('[Template API] 获取模板错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取模板失败' },
      { status: 500 }
    );
  }
}

// 更新模板（仅创建者；企业模板由管理员在后台维护）
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { id: rawId } = await context.params;
    const templateId = parseId(rawId);
    if (templateId === null) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, thumbnail, data, isPublic } = body;

    const [existing] = await db.select().from(templates).where(eq(templates.id, templateId));
    if (!existing) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }
    if (existing.userId === null) {
      return NextResponse.json(
        { success: false, error: '企业模板由管理员在后台维护，不能直接修改' },
        { status: 403 }
      );
    }
    if (existing.userId !== auth.userId) {
      return NextResponse.json({ success: false, error: '无权修改此模板' }, { status: 403 });
    }

    // 可见性由「共享设置」独立维护；这里只在显式传 isPublic 时同步一次，兼容旧调用
    const nextVisibility =
      isPublic === undefined ? existing.visibility : isPublic ? 'public' : existing.visibility === 'public' ? 'private' : existing.visibility;

    await db
      .update(templates)
      .set({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        thumbnail: thumbnail !== undefined ? thumbnail : existing.thumbnail,
        data: data || existing.data,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic,
        visibility: nextVisibility,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId));

    const [updated] = await db.select().from(templates).where(eq(templates.id, templateId));
    const [subject, grants] = await Promise.all([
      loadAccessSubject(auth.userId),
      loadGrantsForTemplate(templateId),
    ]);

    return NextResponse.json({
      success: true,
      data: serializeTemplate(updated, canUseTemplate(updated, subject, grants)),
    });
  } catch (error) {
    console.error('[Template API] 更新模板错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新模板失败' },
      { status: 500 }
    );
  }
}

// 删除模板（仅创建者）
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { id: rawId } = await context.params;
    const templateId = parseId(rawId);
    if (templateId === null) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const [existing] = await db.select().from(templates).where(eq(templates.id, templateId));
    if (!existing) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }
    if (existing.userId === null) {
      return NextResponse.json(
        { success: false, error: '企业模板请由管理员在后台删除' },
        { status: 403 }
      );
    }
    if (existing.userId !== auth.userId) {
      return NextResponse.json({ success: false, error: '无权删除此模板' }, { status: 403 });
    }

    await db.delete(templates).where(eq(templates.id, templateId));

    return NextResponse.json({ success: true, message: '模板删除成功' });
  } catch (error) {
    console.error('[Template API] 删除模板错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除模板失败' },
      { status: 500 }
    );
  }
}