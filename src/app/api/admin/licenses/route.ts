import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pluginLicenses, userLicenseBindings } from '@/lib/db/schema';
import { eq, desc, like, or, and, gte, sql, count } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';
import { 
  generateLicenseCodes, 
  getDurationDays,
  type LicenseType 
} from '@/lib/license-utils';

export const dynamic = 'force-dynamic';

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
 * GET /api/admin/licenses
 * 获取授权码列表（支持分页、搜索、筛选）
 */
export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    // 构建 where 条件
    const conditions = [];
    
    if (status && status !== 'all') {
      conditions.push(eq(pluginLicenses.status, status));
    }
    
    if (type && type !== 'all') {
      conditions.push(eq(pluginLicenses.type, type));
    }
    
    if (search) {
      const searchTerm = `%${search.trim().toUpperCase().replace(/-/g, '')}%`;
      conditions.push(
        or(
          like(pluginLicenses.code, searchTerm),
          like(pluginLicenses.boundUserId, searchTerm),
          like(pluginLicenses.boundUserName, searchTerm),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询总数
    const countResult = await db
      .select({ total: count() })
      .from(pluginLicenses)
      .where(whereClause);
    const total = countResult[0]?.total ?? 0;

    // 分页查询
    const offset = (page - 1) * pageSize;
    const licenseList = await db
      .select()
      .from(pluginLicenses)
      .where(whereClause)
      .orderBy(desc(pluginLicenses.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 处理数据
    const now = new Date();
    const processedLicenses = licenseList.map(license => {
      const validUntil = license.validUntil ? new Date(license.validUntil) : null;
      
      let daysRemaining: number | null = null;
      if (validUntil) {
        daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...license,
        code_formatted: license.code ? 
          license.code.match(/.{1,4}/g)?.join('-') || license.code : 
          '',
        days_remaining: daysRemaining,
        is_expired: daysRemaining !== null && daysRemaining < 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: processedLicenses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[Admin Licenses API] 获取授权码列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取授权码列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/licenses
 * 批量生成授权码
 */
export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();
    const { count = 1, type = 'month', prefix = '', note = '' } = body;
    
    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: '生成数量必须在1-100之间' },
        { status: 400 }
      );
    }
    
    const validTypes = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '无效的有效期类型' },
        { status: 400 }
      );
    }

    const durationDays = getDurationDays(type as LicenseType);
    const codes = generateLicenseCodes(count, type as LicenseType, prefix);
    
    // 批量插入
    const insertValues = codes.map(code => ({
      code: code.replace(/-/g, ''),
      type,
      durationDays,
      status: 'unused' as const,
      note: note || null,
      createdAt: new Date(),
    }));
    
    await db.insert(pluginLicenses).values(insertValues);

    return NextResponse.json({
      success: true,
      data: {
        codes,
        count: codes.length,
        type,
        duration_days: durationDays,
        note,
      },
    });
  } catch (error) {
    console.error('[Admin Licenses API] 生成授权码错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成授权码失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/licenses
 * 作废授权码或物理删除
 */
export async function DELETE(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少授权码ID' },
        { status: 400 }
      );
    }

    const licenseId = parseInt(id);
    
    if (force) {
      // 查询授权码
      const existing = await db
        .select({ status: pluginLicenses.status })
        .from(pluginLicenses)
        .where(eq(pluginLicenses.id, licenseId))
        .limit(1);
      
      const license = existing[0];
      
      if (!license) {
        return NextResponse.json(
          { error: '授权码不存在' },
          { status: 404 }
        );
      }
      
      if (license.status !== 'revoked' && license.status !== 'expired') {
        return NextResponse.json(
          { error: '只能删除已作废或过期的授权码' },
          { status: 400 }
        );
      }
      
      // 先删除关联绑定记录
      await db.delete(userLicenseBindings)
        .where(eq(userLicenseBindings.licenseId, licenseId));
      
      // 物理删除授权码
      await db.delete(pluginLicenses)
        .where(eq(pluginLicenses.id, licenseId));

      return NextResponse.json({
        success: true,
        message: '授权码已永久删除',
      });
    }
    
    // 作废（软删除）
    await db.update(pluginLicenses)
      .set({ status: 'revoked' })
      .where(eq(pluginLicenses.id, licenseId));

    return NextResponse.json({
      success: true,
      message: '授权码已作废',
    });
  } catch (error) {
    console.error('[Admin Licenses API] 处理授权码错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理授权码失败' },
      { status: 500 }
    );
  }
}