import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pluginLicenses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 验证管理员权限
 */
async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: '未授权', status: 401 };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return { error: 'Token 无效', status: 401 };
  }

  if (decoded.type !== 'admin') {
    return { error: '无管理员权限', status: 403 };
  }

  const adminId = (decoded as any).adminId || (decoded as any).userId;
  if (!adminId) {
    return { error: 'Token 格式错误', status: 401 };
  }

  return { userId: adminId, admin: { id: adminId, username: (decoded as any).username || 'admin' } };
}

/**
 * GET /api/admin/licenses/[id]
 * 获取单个授权码详情
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    
    if (!id || isNaN(parseInt(id, 10))) {
      return NextResponse.json(
        { error: '无效的授权码ID' },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(pluginLicenses)
      .where(eq(pluginLicenses.id, parseInt(id, 10)))
      .limit(1);

    const license = result[0];

    if (!license) {
      return NextResponse.json(
        { error: '授权码不存在' },
        { status: 404 }
      );
    }

    // 处理数据
    const now = new Date();
    const validUntil = license.validUntil ? new Date(license.validUntil) : null;
    
    let daysRemaining: number | null = null;
    if (validUntil) {
      daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const processedLicense = {
      ...license,
      code_formatted: license.code ? 
        license.code.match(/.{1,4}/g)?.join('-') || license.code : 
        '',
      days_remaining: daysRemaining,
      is_expired: daysRemaining !== null && daysRemaining < 0,
    };

    return NextResponse.json({
      success: true,
      data: processedLicense,
    });
  } catch (error) {
    console.error('[Admin License Detail API] 获取授权码详情错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取授权码详情失败' },
      { status: 500 }
    );
  }
}