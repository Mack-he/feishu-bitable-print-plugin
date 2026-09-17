import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pluginLicenses, userLicenseBindings } from '@/lib/db/schema';
import { eq, inArray, and, desc } from 'drizzle-orm';
import { calculateDaysRemaining, getLicenseStatusInfo } from '@/lib/license-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/license/status?userId=xxx
 * 查询用户授权状态
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }
    
    const userIdStr = String(userId);
    
    // 查询用户当前有效的授权
    const licenses = await db
      .select()
      .from(pluginLicenses)
      .where(
        inArray(pluginLicenses.status, ['active', 'unused'])
      )
      .where(eq(pluginLicenses.boundUserId, userIdStr))
      .orderBy(desc(pluginLicenses.validUntil))
      .limit(1);
    
    // 没有找到授权记录
    if (licenses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasLicense: false,
          isValid: false,
          isExpired: true,
          requireInput: true,
        },
      });
    }
    
    const license = licenses[0];
    const now = new Date();
    const validUntil = license.validUntil ? new Date(license.validUntil) : null;
    
    console.log('[License Status] 授权码检查:', {
      licenseId: license.id,
      code: license.code,
      status: license.status,
      validUntil: license.validUntil,
    });
    
    const isExpired = !validUntil || validUntil.getTime() < now.getTime();
    const daysRemaining = validUntil ? calculateDaysRemaining(validUntil) : -1;
    
    console.log('[License Status] 检查结果:', { isExpired, daysRemaining });
    
    // 如果已过期，更新状态
    if (isExpired && license.status !== 'expired') {
      await db.update(pluginLicenses)
        .set({ status: 'expired' })
        .where(eq(pluginLicenses.id, license.id));
      
      // 更新绑定记录状态
      await db.update(userLicenseBindings)
        .set({ status: 'expired' })
        .where(eq(userLicenseBindings.licenseId, license.id));
    }
    
    const statusInfo = getLicenseStatusInfo(daysRemaining);
    
    return NextResponse.json({
      success: true,
      data: {
        hasLicense: true,
        isValid: !isExpired,
        isExpired,
        requireInput: isExpired,
        licenseCode: license.code,
        licenseType: license.type,
        durationDays: license.durationDays,
        validUntil: license.validUntil,
        boundAt: license.boundAt,
        daysRemaining: isExpired ? 0 : daysRemaining,
        status: statusInfo.status,
        statusColor: statusInfo.color,
        statusMessage: statusInfo.message,
      },
    });
    
  } catch (error) {
    console.error('[License Status] 查询授权状态错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '查询授权状态失败' },
      { status: 500 }
    );
  }
}