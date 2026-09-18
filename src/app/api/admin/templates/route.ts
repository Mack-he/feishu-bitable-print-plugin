import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templateGrants, templates, users } from '@/lib/db/schema';
import { count, desc, eq, inArray } from 'drizzle-orm';
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
    const userIds = [...new Set(templateList.map((t) => t.userId).filter((id): id is number => typeof id === 'number'))];

    // 查询用户信息
    const usersMap = new Map<number, { id: number; name: string | null; feishuUserId: string; avatar: string | null }>();
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
        usersMap.set(user.id, user);
      }
    }

    // 授权人数统计
    const grantRows = await db
      .select({ templateId: templateGrants.templateId, total: count() })
      .from(templateGrants)
      .groupBy(templateGrants.templateId);
    const grantCountMap = new Map(grantRows.map((row) => [row.templateId, Number(row.total)]));

    // 格式化数据
    const formattedData = templateList.map((template) => {
      const user = typeof template.userId === 'number' ? usersMap.get(template.userId) : undefined;
      return {
        id: template.id,
        userId: template.userId,
        userName: template.userId === null ? '企业模板' : user?.name || '未知用户',
        userAvatar: user?.avatar || '',
        feishuUserId: user?.feishuUserId || '',
        name: template.name,
        description: template.description,
        data: template.data,
        isPublic: template.isPublic,
        visibility: template.visibility,
        status: template.status,
        isEnterprise: template.userId === null,
        sourceTemplateId: template.sourceTemplateId,
        grantCount: grantCountMap.get(template.id) || 0,
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
    const { id, isPublic, name, description, visibility, status } = body;

    const templateId = Number(id);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ success: false, error: '模板 ID 不合法' }, { status: 400 });
    }

    const [existing] = await db.select().from(templates).where(eq(templates.id, templateId));
    if (!existing) {
      return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 });
    }

    if (visibility !== undefined && !['private', 'public', 'restricted'].includes(String(visibility))) {
      return NextResponse.json({ success: false, error: '可见范围不合法' }, { status: 400 });
    }
    if (status !== undefined && !['active', 'disabled'].includes(String(status))) {
      return NextResponse.json({ success: false, error: '状态不合法' }, { status: 400 });
    }
    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ success: false, error: '模板名称不能为空' }, { status: 400 });
    }

    // 可见性：显式传 visibility 优先，其次兼容旧的 isPublic
    const nextVisibility =
      visibility !== undefined
        ? String(visibility)
        : isPublic !== undefined
          ? isPublic
            ? 'public'
            : 'private'
          : existing.visibility;

    await db.update(templates)
      .set({
        name: name !== undefined ? String(name).trim() : existing.name,
        description: description !== undefined ? description : existing.description,
        visibility: nextVisibility,
        isPublic: nextVisibility === 'public',
        status: status !== undefined ? String(status) : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId));

    return NextResponse.json({
      success: true,
      message: '模板已更新',
    });
  } catch (error) {
    console.error('[Admin Templates API] 更新模板错误:', error);
    return NextResponse.json(
      { success: false, error: '更新模板失败' },
      { status: 500 }
    );
  }
}