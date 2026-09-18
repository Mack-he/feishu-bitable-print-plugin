import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, templatePublishRequests, templates, users } from '@/lib/db/schema';
import { replaceTemplateGrants } from '@/lib/template-access-server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/template-publish-requests/[id]
 * 审批发布申请：
 *   { action: 'approve', name?, description?, visibility?, grants? } → 生成企业模板
 *   { action: 'reject', rejectReason } → 驳回
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ success: false, error: '无管理员权限' }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const requestId = Number(rawId);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    const [publishRequest] = await db
      .select()
      .from(templatePublishRequests)
      .where(eq(templatePublishRequests.id, requestId));
    if (!publishRequest) {
      return NextResponse.json({ success: false, error: '申请不存在' }, { status: 404 });
    }
    if (publishRequest.status !== 'pending') {
      return NextResponse.json({ success: false, error: '该申请已处理' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body?.action || '');
    const now = new Date();

    if (action === 'reject') {
      const rejectReason = String(body?.rejectReason || '').trim();
      if (!rejectReason) {
        return NextResponse.json({ success: false, error: '请填写驳回理由' }, { status: 400 });
      }

      await db
        .update(templatePublishRequests)
        .set({
          status: 'rejected',
          rejectReason: rejectReason.slice(0, 500),
          reviewedByAdminId: admin.adminId,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(templatePublishRequests.id, requestId));

      return NextResponse.json({ success: true, message: '已驳回' });
    }

    if (action !== 'approve') {
      return NextResponse.json({ success: false, error: 'action 只能是 approve 或 reject' }, { status: 400 });
    }

    const [source] = await db.select().from(templates).where(eq(templates.id, publishRequest.templateId));
    if (!source) {
      return NextResponse.json({ success: false, error: '源模板已不存在' }, { status: 404 });
    }

    const rawGrants = Array.isArray(body?.grants) ? body.grants : [];
    for (const grant of rawGrants) {
      if (grant?.subjectType !== 'user' && grant?.subjectType !== 'department') {
        return NextResponse.json({ success: false, error: '授权对象类型不合法' }, { status: 400 });
      }
    }

    const userIds = rawGrants.filter((g: any) => g?.subjectType === 'user').map((g: any) => Number(g.subjectId));
    const departmentIds = rawGrants.filter((g: any) => g?.subjectType === 'department').map((g: any) => Number(g.subjectId));
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

    const visibility = String(body?.visibility || (rawGrants.length > 0 ? 'restricted' : 'public'));
    if (!['public', 'restricted', 'private'].includes(visibility)) {
      return NextResponse.json({ success: false, error: '可见范围不合法' }, { status: 400 });
    }

    const [{ id: enterpriseTemplateId }] = await db
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

    await replaceTemplateGrants(
      enterpriseTemplateId,
      rawGrants.map((grant: any) => ({
        subjectType: grant.subjectType,
        subjectId: Number(grant.subjectId),
        includeSubDepartments: grant.includeSubDepartments !== false,
      })),
      { type: 'admin', id: admin.adminId }
    );

    await db
      .update(templatePublishRequests)
      .set({
        status: 'approved',
        reviewedByAdminId: admin.adminId,
        reviewedAt: now,
        enterpriseTemplateId,
        updatedAt: now,
      })
      .where(eq(templatePublishRequests.id, requestId));

    return NextResponse.json({ success: true, data: { enterpriseTemplateId }, message: '已通过并生成企业模板' });
  } catch (error) {
    console.error('[Admin PublishRequests API] 审批发布申请错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '审批失败' },
      { status: 500 }
    );
  }
}