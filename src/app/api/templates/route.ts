import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates, templatePublishRequests } from '@/lib/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { loadVisibleTemplates } from '@/lib/template-access-server';
import { authenticate, serializeTemplate } from './_shared';

export const dynamic = 'force-dynamic';

// 获取模板列表：自己创建的 + 企业模板 + 他人共享给我的（可见性判定见 lib/template-access.ts）
export async function GET(request: Request) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const visible = await loadVisibleTemplates(auth.userId);

    // 我的发布申请状态（用于侧边栏展示「审核中/已驳回」）
    const myTemplateIds = visible.filter((item) => item.access.isOwner).map((item) => item.template.id);
    const requestRows = myTemplateIds.length
      ? await db
          .select()
          .from(templatePublishRequests)
          .where(
            and(
              eq(templatePublishRequests.applicantUserId, auth.userId),
              inArray(templatePublishRequests.templateId, myTemplateIds)
            )
          )
          .orderBy(desc(templatePublishRequests.createdAt))
      : [];

    const requestStatusByTemplate = new Map<number, string>();
    for (const row of requestRows) {
      if (!requestStatusByTemplate.has(row.templateId)) {
        requestStatusByTemplate.set(row.templateId, row.status);
      }
    }

    return NextResponse.json({
      success: true,
      data: visible.map((item) =>
        serializeTemplate(item.template, item.access, {
          source: item.source,
          ownerName: item.ownerName,
          publishRequestStatus: requestStatusByTemplate.get(item.template.id) ?? null,
        })
      ),
    });
  } catch (error) {
    console.error('[Templates API] 获取模板列表错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 创建模板
export async function POST(request: Request) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const { name, description, thumbnail, data, isPublic } = body;

    if (!name || !data) {
      return NextResponse.json({ success: false, error: '模板名称和数据不能为空' }, { status: 400 });
    }

    const now = new Date();
    const [{ id }] = await db
      .insert(templates)
      .values({
        userId: auth.userId,
        name,
        description: description || null,
        thumbnail: thumbnail || null,
        data,
        isPublic: isPublic || false,
        visibility: isPublic ? 'public' : 'private',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .$returningId();

    const [created] = await db.select().from(templates).where(eq(templates.id, id));

    return NextResponse.json({
      success: true,
      data: serializeTemplate(created, {
        isOwner: true,
        isEnterprise: false,
        canView: true,
        canPrint: true,
        canEdit: true,
        canCopy: true,
      }, { source: 'mine' }),
    });
  } catch (error) {
    console.error('[Templates API] 创建模板错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建模板失败' },
      { status: 500 }
    );
  }
}