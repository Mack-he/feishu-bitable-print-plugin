import { NextResponse } from 'next/server';
import { asc, eq, like, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, users } from '@/lib/db/schema';
import { authenticate } from '../templates/_shared';

export const dynamic = 'force-dynamic';

/**
 * 授权选择器的数据源：可授权的用户与部门
 * 仅登录用户可调用；用户只返回 id/name/avatar（不暴露邮箱等），部门返回树所需的最小字段
 */
export async function GET(request: Request) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const keyword = (searchParams.get('keyword') || '').trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));

    const userRows = await db
      .select({ id: users.id, name: users.name, avatar: users.avatar })
      .from(users)
      .where(keyword ? or(like(users.name, `%${keyword}%`), like(users.email, `%${keyword}%`)) : undefined)
      .orderBy(asc(users.id))
      .limit(limit);

    const departmentRows = await db
      .select({
        id: departments.id,
        name: departments.name,
        parentFeishuDepartmentId: departments.parentFeishuDepartmentId,
        path: departments.path,
        memberCount: departments.memberCount,
      })
      .from(departments)
      .where(eq(departments.status, 'active'))
      .orderBy(asc(departments.path));

    return NextResponse.json({
      success: true,
      data: {
        users: userRows,
        departments: departmentRows,
      },
    });
  } catch (error) {
    console.error('[ShareDirectory API] 获取共享目录错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取共享目录失败' },
      { status: 500 }
    );
  }
}