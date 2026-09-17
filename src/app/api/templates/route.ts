import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取模板列表
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: '登录已过期' },
        { status: 401 }
      );
    }
    
    const result = await db
      .select()
      .from(templates)
      .where(eq(templates.userId, decoded.userId))
      .orderBy(desc(templates.updatedAt));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Templates API] 获取模板列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 创建模板
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: '登录已过期' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, description, thumbnail, data, isPublic } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: '模板名称和数据不能为空' },
        { status: 400 }
      );
    }

    const result = await db.insert(templates).values({
      userId: decoded.userId,
      name,
      description: description || null,
      thumbnail: thumbnail || null,
      data,
      isPublic: isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 查询刚插入的记录
    const inserted = await db
      .select()
      .from(templates)
      .where(eq(templates.userId, decoded.userId))
      .orderBy(desc(templates.createdAt))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: inserted[0],
    });
  } catch (error) {
    console.error('[Templates API] 创建模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建模板失败' },
      { status: 500 }
    );
  }
}