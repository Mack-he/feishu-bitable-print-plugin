import { NextResponse } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { templatePublishRequests, templates, users } from '@/lib/db/schema';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/template-publish-requests?status=pending|approved|rejected|all
 * 企业模板发布申请列表（带申请人与模板信息）
 */
export async function GET(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: '无管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const rows = await db
      .select({
        request: templatePublishRequests,
        templateName: templates.name,
        templateVisibility: templates.visibility,
        applicantName: users.name,
        applicantEmail: users.email,
      })
      .from(templatePublishRequests)
      .leftJoin(templates, eq(templates.id, templatePublishRequests.templateId))
      .leftJoin(users, eq(users.id, templatePublishRequests.applicantUserId))
      .where(status === 'all' ? undefined : eq(templatePublishRequests.status, status))
      .orderBy(status === 'pending' ? asc(templatePublishRequests.createdAt) : desc(templatePublishRequests.createdAt));

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.request.id,
        templateId: row.request.templateId,
        templateName: row.templateName,
        templateVisibility: row.templateVisibility,
        applicantUserId: row.request.applicantUserId,
        applicantName: row.applicantName,
        applicantEmail: row.applicantEmail,
        note: row.request.note,
        status: row.request.status,
        rejectReason: row.request.rejectReason,
        enterpriseTemplateId: row.request.enterpriseTemplateId,
        reviewedAt: row.request.reviewedAt,
        createdAt: row.request.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Admin PublishRequests API] 获取发布申请错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取发布申请失败' },
      { status: 500 }
    );
  }
}