import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取单个模板
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const templateId = parseInt(id);
    
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
      .where(eq(templates.id, templateId))
      .limit(1);

    const template = result[0];

    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    if (template.userId !== decoded.userId && !template.isPublic) {
      return NextResponse.json(
        { error: '无权访问此模板' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[Template API] 获取模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模板失败' },
      { status: 500 }
    );
  }
}

// 更新模板
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const templateId = parseInt(id);
    
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

    // 查询现有模板
    const existing = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    const existingTemplate = existing[0];

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    if (existingTemplate.userId !== decoded.userId) {
      return NextResponse.json(
        { error: '无权修改此模板' },
        { status: 403 }
      );
    }

    await db.update(templates)
      .set({
        name: name || existingTemplate.name,
        description: description !== undefined ? description : existingTemplate.description,
        thumbnail: thumbnail !== undefined ? thumbnail : existingTemplate.thumbnail,
        data: data || existingTemplate.data,
        isPublic: isPublic !== undefined ? isPublic : existingTemplate.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId));

    // 查询更新后的记录
    const updated = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error('[Template API] 更新模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新模板失败' },
      { status: 500 }
    );
  }
}

// 删除模板
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const templateId = parseInt(id);
    console.log('[Template API] 删除模板请求:', { id: templateId });
    
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
    
    // 查询模板
    const existing = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    const existingTemplate = existing[0];

    if (!existingTemplate) {
      // 列出该用户的所有模板帮助调试
      const userTemplates = await db
        .select({ id: templates.id, name: templates.name, userId: templates.userId })
        .from(templates)
        .where(eq(templates.userId, decoded.userId));
      
      return NextResponse.json(
        { error: '模板不存在', availableTemplates: userTemplates },
        { status: 404 }
      );
    }

    console.log('[Template API] 找到模板:', { id: existingTemplate.id, name: existingTemplate.name, userId: existingTemplate.userId });
    
    if (existingTemplate.userId !== decoded.userId) {
      return NextResponse.json(
        { error: '无权删除此模板' },
        { status: 403 }
      );
    }

    await db.delete(templates)
      .where(eq(templates.id, templateId));

    return NextResponse.json({
      success: true,
      message: '模板删除成功',
    });
  } catch (error) {
    console.error('[Template API] 删除模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除模板失败' },
      { status: 500 }
    );
  }
}