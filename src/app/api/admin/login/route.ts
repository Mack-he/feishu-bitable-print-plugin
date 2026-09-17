import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { generateAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// 管理员登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // TODO: 从数据库查询管理员
    // const admin = await db.query.admins.findFirst({
    //   where: eq(admins.username, username)
    // });

    // 临时模拟（实际开发时从数据库查询）
    // 注意：实际生产中密码需要哈希存储，这里只是演示
    const mockAdmin = {
      id: 1,
      username: 'fsadmins',
      name: '管理员',
      email: 'admin@example.com',
      isActive: true,
      // 实际密码哈希需要用 hashPassword('Xxy94128866') 生成
      passwordHash: 'placeholder_hashed_password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: 验证密码
    // const isValid = await verifyPassword(password, admin.passwordHash);
    // if (!isValid) { ... }

    // 临时演示：硬编码验证（实际开发时移除）
    if (username !== 'fsadmins' || password !== 'Xxy94128866') {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // 生成 JWT Token
    const token = generateAdminToken({
      adminId: mockAdmin.id,
      username: mockAdmin.username,
      type: 'admin',
    });

    // TODO: 更新管理员最后登录时间
    // await db.update(admins)
    //   .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    //   .where(eq(admins.id, admin.id));

    // 返回登录成功响应（不包含密码哈希）
    const { passwordHash: _, ...adminWithoutPassword } = mockAdmin;

    return NextResponse.json({
      success: true,
      data: {
        token,
        admin: adminWithoutPassword,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
