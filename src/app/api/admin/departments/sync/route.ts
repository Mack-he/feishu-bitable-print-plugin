import { NextResponse } from 'next/server';
import {
  DepartmentSyncBusyError,
  FeishuContactPermissionError,
  syncDepartmentsFromFeishu,
} from '@/lib/feishu-contact';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/departments/sync
 * 从飞书通讯录同步部门树与用户-部门关系（按 user_id 查询）
 *
 * 可选 body：
 *   userBatchSize  本次刷新多少个用户的部门关系（默认 500，上限 5000）
 *   userOffset     从第几个用户开始，用于分批续传（响应里的 userSync.nextOffset）
 *
 * 部门侧每次都是全量：飞书侧已删除或不在应用可见范围的部门会被标记为 inactive
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

    const body = (await request.json().catch(() => ({}))) as {
      userBatchSize?: number;
      userOffset?: number;
    };

    const result = await syncDepartmentsFromFeishu({
      userBatchSize: Number(body?.userBatchSize) || undefined,
      userOffset: Number(body?.userOffset) || 0,
    });

    const summary = [
      `部门 ${result.departmentCount} 个`,
      `用户部门关系已更新 ${result.linkedUserCount} 人`,
    ];
    if (result.deactivatedDepartmentCount > 0) {
      const names = result.deactivatedDepartments.map((item) => item.name).join('、');
      const suffix = result.deactivatedDepartmentCount > result.deactivatedDepartments.length ? ' 等' : '';
      summary.push(`标记失效部门 ${result.deactivatedDepartmentCount} 个（${names}${suffix}）`);
    }
    if (result.userSync.remaining > 0) {
      summary.push(`还剩 ${result.userSync.remaining} 人待刷新，可继续同步`);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `同步完成：${summary.join('，')}`,
    });
  } catch (error) {
    if (error instanceof DepartmentSyncBusyError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error instanceof FeishuContactPermissionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error('[Admin Departments Sync API] 同步部门错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '同步部门失败' },
      { status: 500 }
    );
  }
}