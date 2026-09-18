import { NextResponse } from 'next/server';
import { FeishuContactPermissionError, syncDepartmentsFromFeishu } from '@/lib/feishu-contact';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/departments/sync
 * 从飞书通讯录同步部门树与用户-部门关系（按 user_id 查询）
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

    const result = await syncDepartmentsFromFeishu();

    return NextResponse.json({
      success: true,
      data: result,
      message: `同步完成：部门 ${result.departmentCount} 个，用户部门关系已更新 ${result.linkedUserCount} 人`,
    });
  } catch (error) {
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