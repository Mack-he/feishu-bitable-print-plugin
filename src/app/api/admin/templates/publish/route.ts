import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, templates, users } from '@/lib/db/schema';
import { replaceTemplateGrants } from '@/lib/template-access-server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

interface GrantInput {
  subjectType: 'user' | 'department';
  subjectId: number;
  includeSubDepartments?: boolean;
}

async function validateGrants(rawGrants: unknown): Promise<{ error: string } | { grants: GrantInput[] }> {
  if (rawGrants === undefined) return { grants: [] };
  if (!Array.isArray(rawGrants)) return { error: '授权名单格式不合法' };

  const grants: GrantInput[] = [];
  for (const item of rawGrants) {
    const subjectType = (item as any)?.subjectType;
    const subjectId = Number((item as any)?.subjectId);
    if (subjectType !== 'user' && subjectType !== 'department') {
      return { error: '授权对象类型不合法' };
    }
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return { error: '授权对象 id 不合法' };
    }
    grants.push({
      subjectType,
      subjectId,
      includeSubDepartments: (item as any)?.includeSubDepartments !== false,
    });
  }

  const userIds = grants.filter((g) => g.subjectType === 'user').map((g) => g.subjectId);
  const departmentIds = grants.filter((g) => g.subjectType === 'department').map((g) => g.subjectId);
  const [existingUsers, existingDepartments] = await Promise.all([
    userIds.length ? db.select({ id: users.id }).from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
    departmentIds.length
      ? db.select({ id: departments.id }).from(departments).where(inArray(departments.id, departmentIds))
      : Promise.resolve([]),
  ]);
  const validUsers = new Set(existingUsers.map((row) => row.id));
  const validDepartments = new Set(existingDepartments.map((row) => row.id));
  const invalid = [
    ...userIds.filter((id) => !validUsers.has(id)).map((id) => `用户#${id}`),
    ...departmentIds.filter((id) => !validDepartments.has(id)).map((id) => `部门#${id}`),
  ];
  if (invalid.length > 0) return { error: `授权对象不存在：${invalid.join('、')}` };

  return { grants };
}

/**
 * POST /api/admin/templates/publish
 * 把某个模板发布为企业模板（userId = NULL），并可直接配置授权名单
 * body: { sourceTemplateId, name?, description?, visibility?, grants?, enterpriseTemplateId? }
 *   传 enterpriseTemplateId 表示「从源模板重新发布内容」到已有企版
 */
export async function POST(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: '无管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const sourceTemplateId = Number(body?.sourceTemplateId);
    if (!Number.isInteger(sourceTemplateId) || sourceTemplateId <= 0) {
      return NextResponse.json({ success: false, error: '请选择要发布的源模板' }, { status: 400 });
    }

    const [source] = await db.select().from(templates).where(eq(templates.id, sourceTemplateId));
    if (!source) {
      return NextResponse.json({ success: false, error: '源模板不存在' }, { status: 404 });
    }

    const parsedGrants = await validateGrants(body?.grants);
    if ('error' in parsedGrants) {
      return NextResponse.json({ success: false, error: parsedGrants.error }, { status: 400 });
    }

    const visibility = String(body?.visibility || (parsedGrants.grants.length > 0 ? 'restricted' : 'public'));
    if (!['public', 'restricted', 'private'].includes(visibility)) {
      return NextResponse.json({ success: false, error: '可见范围不合法' }, { status: 400 });
    }

    const now = new Date();
    const enterpriseTemplateId = Number(body?.enterpriseTemplateId);
    const isRepublish = Number.isInteger(enterpriseTemplateId) && enterpriseTemplateId > 0;

    let targetId: number;

    if (isRepublish) {
      const [existing] = await db.select().from(templates).where(eq(templates.id, enterpriseTemplateId));
      if (!existing) {
        return NextResponse.json({ success: false, error: '企业模板不存在' }, { status: 404 });
      }
      if (existing.userId !== null) {
        return NextResponse.json({ success: false, error: '该模板不是企业模板' }, { status: 400 });
      }

      await db
        .update(templates)
        .set({
          name: body?.name || existing.name,
          description: body?.description !== undefined ? body.description : existing.description,
          data: source.data,
          visibility,
          isPublic: visibility === 'public',
          sourceTemplateId: source.id,
          updatedAt: now,
        })
        .where(eq(templates.id, enterpriseTemplateId));
      targetId = enterpriseTemplateId;
    } else {
      const [{ id }] = await db
        .insert(templates)
        .values({
          userId: null,
          name: body?.name || source.name,
          description: body?.description !== undefined ? body.description : source.description,
          thumbnail: source.thumbnail,
          data: source.data,
          isPublic: visibility === 'public',
          visibility,
          status: 'active',
          sourceTemplateId: source.id,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      targetId = id;
    }

    if (body?.grants !== undefined) {
      await replaceTemplateGrants(targetId, parsedGrants.grants, { type: 'admin', id: payload.adminId });
    }

    const [created] = await db.select().from(templates).where(eq(templates.id, targetId));

    return NextResponse.json({ success: true, data: created, message: isRepublish ? '已重新发布' : '企业模板已创建' });
  } catch (error) {
    console.error('[Admin Templates Publish API] 发布企业模板错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发布企业模板失败' },
      { status: 500 }
    );
  }
}