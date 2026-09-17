import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pluginLicenses } from '@/lib/db/schema';
import { gte, count, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

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
 * GET /api/admin/licenses/stats
 * 获取授权码统计数据
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
    // 获取所有授权码的状态
    const allLicenses = await db
      .select({ status: pluginLicenses.status })
      .from(pluginLicenses);

    // 统计各状态数量
    const stats = {
      total: allLicenses.length,
      unused: 0,
      active: 0,
      expired: 0,
      revoked: 0,
    };

    for (const item of allLicenses) {
      if (item.status && item.status in stats) {
        stats[item.status as keyof typeof stats]++;
      }
    }

    // 获取各类型授权码数量
    const typeData = await db
      .select({ type: pluginLicenses.type })
      .from(pluginLicenses);

    const typeStats: Record<string, number> = {
      day: 0,
      week: 0,
      month: 0,
      quarter: 0,
      year: 0,
    };

    for (const item of typeData) {
      if (item.type && item.type in typeStats) {
        typeStats[item.type]++;
      }
    }

    // 获取今日生成的授权码数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayResult = await db
      .select({ total: count() })
      .from(pluginLicenses)
      .where(gte(pluginLicenses.createdAt, today));
    const todayCount = todayResult[0]?.total ?? 0;

    // 获取最近7天趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const trendData = await db
      .select({ createdAt: pluginLicenses.createdAt })
      .from(pluginLicenses)
      .where(gte(pluginLicenses.createdAt, sevenDaysAgo));

    // 按日期分组统计
    const dailyStats: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = 0;
    }

    for (const item of trendData) {
      const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
      if (dateStr in dailyStats) {
        dailyStats[dateStr]++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: stats,
        type: typeStats,
        today: todayCount,
        dailyTrend: Object.entries(dailyStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, cnt]) => ({ date, count: cnt })),
      },
    });
  } catch (error) {
    console.error('[Admin Licenses Stats API] 获取统计数据错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取统计数据失败' },
      { status: 500 }
    );
  }
}