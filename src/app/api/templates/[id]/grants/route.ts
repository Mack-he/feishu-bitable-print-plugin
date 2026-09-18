import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, templates, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { loadGrantsWithSubjects, replaceTemplateGrants } from '@/lib/template-access-server';
import { authenticate } from '../../_shared';

export const dynamic = 'force-dynamic';

const VISIBILITIES = ['private', 'public', 'restricted'];

/** 只有模板创建者能配置共享；企业模板由管理员在后台配置 */
async function loadOwnedTemplate(templateId: number, userId: number) {
  const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
  if (!template) return { error: '模板不存在', status: 404 as const };
  if (template.userId === null) return { error: '企业模板请在管理后台配置授权', status: 403 as const };
  if (template.userId !== userId) return { error: '无权修改此模板的共享设置', status: 403 as const };
  return { template };
}

// 查看共享设置
export async function GET(
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

    const owned = await loadOwnedTemplate(templateId, auth.userId);
    if ('error' in owned) {
      return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });
    }

    const grants = await loadGrantsWithSubjects(templateId);

    return NextResponse.json({
      success: true,
      data: { visibility: owned.template.visibility, grants },
    });
  } catch (error) {
    console.error('[Template Grants API] 获取共享设置错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取共享设置失败' },
      { status: 500 }
    );
  }
}

// 保存共享设置（可见范围 + 授权名单，覆盖式保存）
export async function PUT(
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

    const owned = await loadOwnedTemplate(templateId, auth.userId);
    if ('error' in owned) {
      return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });
    }

    const body = await request.json();
    const visibility = String(body?.visibility ?? owned.template.visibility);
    if (!VISIBILITIES.includes(visibility)) {
      return NextResponse.json(
        { success: false, error: '可见范围只能是 private / public / restricted' },
        { status: 400 }
      );
    }

    const rawGrants = Array.isArray(body?.grants) ? body.grants : [];
    const userIds = rawGrants.filter((g: any) => g?.subjectType === 'user').map((g: any) => Number(g.subjectId));
    const departmentIds = rawGrants.filter((g: any) => g?.subjectType === 'department').map((g: any) => Number(g.subjectId));

    for (const grant of rawGrants) {
      if (grant?.subjectType !== 'user' && grant?.subjectType !== 'department') {
        return NextResponse.json({ success: false, error: '授权对象类型不合法' }, { status: 400 });
      }
      if (!Number.isInteger(Number(grant?.subjectId))) {
        return NextResponse.json({ success: false, error: '授权对象 id 不合法' }, { status: 400 });
      }
    }

    // 校验授权对象真实存在，避免脏数据
    const [existingUsers, existingDepartments] = await Promise.all([
      userIds.length ? db.select({ id: users.id }).from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
      departmentIds.length
        ? db.select({ id: departments.id }).from(departments).where(inArray(departments.id, departmentIds))
        : Promise.resolve([]),
    ]);
    const validUserIds = new Set(existingUsers.map((row) => row.id));
    const validDepartmentIds = new Set(existingDepartments.map((row) => row.id));

    const invalid = [
      ...userIds.filter((id: number) => !validUserIds.has(id)).map((id: number) => `用户#${id}`),
      ...departmentIds.filter((id: number) => !validDepartmentIds.has(id)).map((id: number) => `部门#${id}`),
    ];
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: `授权对象不存在：${invalid.join('、')}` },
        { status: 400 }
      );
    }

    await db
      .update(templates)
      .set({ visibility, isPublic: visibility === 'public', updatedAt: new Date() })
      .where(eq(templates.id, templateId));

    await replaceTemplateGrants(
      templateId,
      rawGrants.map((grant: any) => ({
        subjectType: grant.subjectType,
        subjectId: Number(grant.subjectId),
        includeSubDepartments: grant.includeSubDepartments !== false,
      })),
      { type: 'user', id: auth.userId }
    );

    const grants = await loadGrantsWithSubjects(templateId);

    return NextResponse.json({ success: true, data: { visibility, grants } });
  } catch (error) {
    console.error('[Template Grants API] 保存共享设置错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存共享设置失败' },
      { status: 500 }
    );
  }
}