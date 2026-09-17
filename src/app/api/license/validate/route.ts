import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pluginLicenses, userLicenseBindings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { 
  normalizeLicenseCode, 
  calculateExpiryDate,
  calculateDaysRemaining,
} from '@/lib/license-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/license/validate
 * 验证并绑定授权码
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, userId, userName } = body;
    
    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const normalizedCode = normalizeLicenseCode(code);
    
    if (normalizedCode.length !== 16) {
      return NextResponse.json(
        { success: false, error: '授权码格式不正确' },
        { status: 400 }
      );
    }
    
    // 1. 查找授权码
    const result = await db
      .select()
      .from(pluginLicenses)
      .where(eq(pluginLicenses.code, normalizedCode))
      .limit(1);
    
    const license = result[0];
    
    if (!license) {
      console.log('[License Validate] 授权码不存在:', normalizedCode);
      return NextResponse.json(
        { success: false, error: '授权码不存在' },
        { status: 404 }
      );
    }
    
    // 2. 检查授权码状态
    if (license.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: '授权码已被作废' },
        { status: 400 }
      );
    }
    
    if (license.status === 'expired') {
      return NextResponse.json(
        { success: false, error: '授权码已过期' },
        { status: 400 }
      );
    }
    
    // 3. 检查是否已被其他用户绑定
    if (license.boundUserId && license.boundUserId !== userId) {
      return NextResponse.json(
        { success: false, error: '授权码已被其他用户使用' },
        { status: 400 }
      );
    }
    
    // 4. 检查是否已绑定当前用户（续期场景）
    if (license.boundUserId === userId && license.validUntil) {
      const currentValidUntil = new Date(license.validUntil);
      const now = new Date();
      
      const startDate = currentValidUntil > now ? currentValidUntil : now;
      const newValidUntil = calculateExpiryDate(startDate, license.durationDays);
      
      const userIdStr = String(userId);
      
      await db.update(pluginLicenses)
        .set({
          validUntil: newValidUntil,
          status: 'active',
        })
        .where(eq(pluginLicenses.id, license.id));
      
      // 记录绑定历史
      await db.insert(userLicenseBindings).values({
        licenseId: license.id,
        userId: userIdStr,
        userName: userName || null,
        validUntil: newValidUntil,
        status: 'active',
        createdAt: new Date(),
      });
      
      const daysRemaining = calculateDaysRemaining(newValidUntil);
      
      return NextResponse.json({
        success: true,
        data: {
          message: '授权码续期成功',
          validUntil: newValidUntil.toISOString(),
          daysRemaining,
          isRenewal: true,
        },
      });
    }
    
    // 5. 新绑定用户
    const validUntil = calculateExpiryDate(new Date(), license.durationDays);
    
    const userIdStr = String(userId);
    
    await db.update(pluginLicenses)
      .set({
        status: 'active',
        boundUserId: userIdStr,
        boundUserName: userName || null,
        boundAt: new Date(),
        validUntil: validUntil,
      })
      .where(eq(pluginLicenses.id, license.id));
    
    // 记录绑定历史
    await db.insert(userLicenseBindings).values({
      licenseId: license.id,
      userId: userId,
      userName: userName || null,
      validUntil: validUntil,
      status: 'active',
      createdAt: new Date(),
    });
    
    const daysRemaining = calculateDaysRemaining(validUntil);
    
    return NextResponse.json({
      success: true,
      data: {
        message: '授权码激活成功',
        validUntil: validUntil.toISOString(),
        daysRemaining,
        isRenewal: false,
      },
    });
    
  } catch (error) {
    console.error('[License Validate] 验证授权码错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '验证授权码失败' },
      { status: 500 }
    );
  }
}