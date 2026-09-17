import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates, users } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// 获取所有模板列表（需要管理员权限）
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

    // 查询所有模板
    const templateList = await db
      .select()
      .from(templates)
      .orderBy(desc(templates.updatedAt));

    // 获取所有相关的用户ID
    const userIds = [...new Set(templateList.map(t => t.userId).filter(Boolean))] as number[];
    
    // 查询用户信息
    let usersMap: Record<number, typeof users.$inferSelect> = {};
    if (userIds.length > 0) {
      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          feishuUserId: users.feishuUserId,
          avatar: users.avatar,
        })
        .from(users)
        .where(inArray(users.id, userIds));
      
      for (const user of userList) {
        usersMap[user.id] = user;
      }
    }

    // 格式化数据
    const formattedData = templateList.map(template => {
      const user = usersMap[template.userId as number];
      return {
        id: template.id,
        userId: template.userId,
        userName: user?.name || '未知用户',
        userAvatar: user?.avatar || '',
        feishuUserId: user?.feishuUserId || '',
        name: template.name,
        description: template.description,
        data: template.data,
        isPublic: template.isPublic,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('[Admin Templates API] 获取模板列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 删除模板（需要管理员权限）
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '模板ID不能为空' },
        { status: 400 }
      );
    }

    await db.delete(templates)
      .where(eq(templates.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: '模板已删除',
    });
  } catch (error) {
    console.error('[Admin Templates API] 删除模板错误:', error);
    return NextResponse.json(
      { success: false, error: '删除模板失败' },
      { status: 500 }
    );
  }
}

// 更新模板状态（需要管理员权限）
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { id, isPublic } = body;

    if (!id || typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    await db.update(templates)
      .set({ isPublic, updatedAt: new Date() })
      .where(eq(templates.id, id));

    return NextResponse.json({
      success: true,
      message: '模板状态已更新',
    });
  } catch (error) {
    console.error('[Admin Templates API] 更新模板错误:', error);
    return NextResponse.json(
      { success: false, error: '更新模板失败' },
      { status: 500 }
    );
  }
}