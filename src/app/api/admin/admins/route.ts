import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

// 获取管理员列表（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
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

    // TODO: 从数据库查询所有管理员
    // const admins = await db.query.admins.findMany();

    return NextResponse.json({
      success: true,
      data: [], // admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get admins' },
      { status: 500 }
    );
  }
}

// 创建新管理员（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
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

    const body = await request.json();
    const { username, password, name, email } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // TODO: 保存到数据库
    // const newAdmin = await db.insert(admins).values({
    //   username,
    //   passwordHash,
    //   name,
    //   email,
    // });

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      data: { id: 'placeholder', username, name, email },
    }, { status: 201 });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}
