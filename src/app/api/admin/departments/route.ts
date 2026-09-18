import { NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, templateGrants, userDepartments } from '@/lib/db/schema';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';
import { getDepartmentScheduleStatus, type DepartmentScheduleStatus } from '@/lib/department-scheduler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/departments
 * 部门列表（含人数与同步时间），供后台部门管理与授权选择器使用
 */
export async function GET(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: '无管理员权限' }, { status: 403 });
    }

    const rows = await db
      .select({
        id: departments.id,
        feishuDepartmentId: departments.feishuDepartmentId,
        name: departments.name,
        parentFeishuDepartmentId: departments.parentFeishuDepartmentId,
        path: departments.path,
        memberCount: departments.memberCount,
        status: departments.status,
        lastSyncedAt: departments.lastSyncedAt,
        // 系统内已建立关联的用户数（不是飞书部门人数）
        linkedUserCount: sql<number>`(
          SELECT COUNT(*) FROM ${userDepartments} ud WHERE ud.department_id = ${departments.id}
        )`,
      })
      .from(departments)
      .orderBy(asc(departments.path), asc(departments.id));

    const [linkedUsers] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${userDepartments.userId})` })
      .from(userDepartments);

    const lastSync = rows.reduce<Date | null>((latest, row) => {
      if (!row.lastSyncedAt) return latest;
      return !latest || row.lastSyncedAt > latest ? row.lastSyncedAt : latest;
    }, null);

    // 内置定时同步的状态，读失败不影响部门列表本身
    let schedule: DepartmentScheduleStatus | null = null;
    try {
      schedule = await getDepartmentScheduleStatus();
    } catch (scheduleError) {
      console.warn('[Admin Departments API] 读取定时同步状态失败:', scheduleError);
    }

    return NextResponse.json({
      success: true,
      data: rows,
      meta: {
        departmentCount: rows.length,
        linkedUserCount: Number(linkedUsers?.count || 0),
        lastSyncedAt: lastSync,
        schedule,
      },
    });
  } catch (error) {
    console.error('[Admin Departments API] 获取部门列表错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取部门列表失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/departments?id=xx
 * 删除本地部门记录（不影响飞书；重新同步会再出现）
 * 同时清理该部门的用户关联与授权名单，避免留下指向空部门的僵尸授权
 */
export async function DELETE(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: '无管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: '参数不合法' }, { status: 400 });
    }

    await db
      .delete(templateGrants)
      .where(and(eq(templateGrants.subjectType, 'department'), eq(templateGrants.subjectId, id)));
    await db.delete(userDepartments).where(eq(userDepartments.departmentId, id));
    await db.delete(departments).where(eq(departments.id, id));

    return NextResponse.json({ success: true, message: '已删除（含该部门的授权记录）' });
  } catch (error) {
    console.error('[Admin Departments API] 删除部门错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除部门失败' },
      { status: 500 }
    );
  }
}