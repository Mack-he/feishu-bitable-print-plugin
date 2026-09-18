import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, templates, users } from '@/lib/db/schema';
import { loadGrantsWithSubjects, replaceTemplateGrants } from '@/lib/template-access-server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

const VISIBILITIES = ['private', 'public', 'restricted'];

async function requireAdmin(request: Request) {
  const token = extractTokenFromHeader(request.headers.get('authorization'));
  if (!token) return { error: NextResponse.json({ success: false, error: '未授权' }, { status: 401 }) };
  const payload = verifyAdminToken(token);
  if (!payload) return { error: NextResponse.json({ success: false, error: '无管理员权限' }, { status: 403 }) };
  return { adminId: payload.adminId };
}

/** 管理员查看任意模板的授权名单 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
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

    const grants = await loadGrantsWithSubjects(templateId);
    return NextResponse.json({
      success: true,
      data: { templateId, visibility: template.visibility, status: template.status, grants },
    });
  } catch (error) {
    console.error('[Admin Template Grants API] 获取授权名单错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取授权名单失败' },
      { status: 500 }
    );
  }
}

/** 管理员保存授权名单（企业模板的主要配置入口） */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
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

    const body = await request.json();
    const visibility = body?.visibility ? String(body.visibility) : template.visibility;
    if (!VISIBILITIES.includes(visibility)) {
      return NextResponse.json({ success: false, error: '可见范围不合法' }, { status: 400 });
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

    const [existingUsers, existingDepartments] = await Promise.all([
      userIds.length ? db.select({ id: users.id }).from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
      departmentIds.length
        ? db.select({ id: departments.id }).from(departments).where(inArray(departments.id, departmentIds))
        : Promise.resolve([]),
    ]);
    const validUsers = new Set(existingUsers.map((row) => row.id));
    const validDepartments = new Set(existingDepartments.map((row) => row.id));
    const invalid = [
      ...userIds.filter((id: number) => !validUsers.has(id)).map((id: number) => `用户#${id}`),
      ...departmentIds.filter((id: number) => !validDepartments.has(id)).map((id: number) => `部门#${id}`),
    ];
    if (invalid.length > 0) {
      return NextResponse.json({ success: false, error: `授权对象不存在：${invalid.join('、')}` }, { status: 400 });
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
      { type: 'admin', id: auth.adminId }
    );

    const grants = await loadGrantsWithSubjects(templateId);
    return NextResponse.json({ success: true, data: { visibility, grants } });
  } catch (error) {
    console.error('[Admin Template Grants API] 保存授权名单错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存授权名单失败' },
      { status: 500 }
    );
  }
}