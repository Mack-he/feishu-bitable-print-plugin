import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userTableAuthorizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { extractTokenFromHeader, verifyUserToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * 删除用户账号
 * - 删除用户的所有授权码信息
 * - 删除用户的飞书登录信息
 * - 用户需要重新登录和绑定授权码
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyUserToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    console.log('[Delete Account API] 开始删除用户账号:', userId);

    // 1. 删除用户的授权码信息
    await db.delete(userTableAuthorizations)
      .where(eq(userTableAuthorizations.userId, userId));

    console.log('[Delete Account API] 授权码已删除');

    // 2. 删除用户信息
    await db.delete(users)
      .where(eq(users.id, userId));

    console.log('[Delete Account API] 用户账号已删除:', userId);

    return NextResponse.json({
      success: true,
      message: '账号已删除',
    });
  } catch (error) {
    console.error('[Delete Account API] 删除账号错误:', error);
    return NextResponse.json(
      { success: false, error: '删除账号失败' },
      { status: 500 }
    );
  }
}