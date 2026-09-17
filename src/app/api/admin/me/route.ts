import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// 获取当前管理员信息
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // TODO: 从数据库查询管理员信息
    // const admin = await db.query.admins.findFirst({
    //   where: eq(admins.id, payload.adminId)
    // });

    // 临时模拟
    const mockAdmin = {
      id: payload.adminId,
      username: payload.username,
      name: '管理员',
      email: 'admin@example.com',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      admin: mockAdmin,
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get admin info' },
      { status: 500 }
    );
  }
}
