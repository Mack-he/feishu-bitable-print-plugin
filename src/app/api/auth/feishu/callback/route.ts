import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, pluginLicenses } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { generateToken } from '@/lib/auth';
import { getUserAccessToken, getUserInfo } from '@/lib/feishu-oauth';

export const dynamic = 'force-dynamic';

// 从请求头获取正确的基础 URL
function getBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  const headers = new Headers(request.headers);
  const host = headers.get('host') || 'localhost:5000';
  const proto = headers.get('x-forwarded-proto') || 'http';
  
  if (host === 'localhost:5000' && process.env.FEISHU_REDIRECT_URI) {
    try {
      const redirectUrl = new URL(process.env.FEISHU_REDIRECT_URI);
      return `${redirectUrl.protocol}//${redirectUrl.host}`;
    } catch {
      // 忽略
    }
  }
  
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  console.log('[Feishu OAuth Callback API] 收到回调请求');
  console.log('[Feishu OAuth Callback API] Base URL:', baseUrl);
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      console.error('[Feishu OAuth Callback API] 缺少 code 参数');
      return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
    }

    console.log('[Feishu OAuth Callback API] Code:', code ? '***' : 'missing');
    console.log('[Feishu OAuth Callback API] State:', state);

    // 1. 获取用户访问令牌
    console.log('[Feishu OAuth Callback API] 获取用户访问令牌');
    const userAccessToken = await getUserAccessToken(code);

    // 2. 获取用户信息
    console.log('[Feishu OAuth Callback API] 获取用户信息');
    const feishuUserInfo = await getUserInfo(userAccessToken.access_token);

    // 3. 查找或创建用户
    console.log('[Feishu OAuth Callback API] 查找用户，union_id:', feishuUserInfo.union_id);
    
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.feishuUnionId, feishuUserInfo.union_id));

    let dbUser = existingUsers.length > 0 ? existingUsers[0] : null;

    if (!dbUser) {
      console.log('[Feishu OAuth Callback API] 新用户，自动注册');
      
      const feishuUserId = feishuUserInfo.user_id || feishuUserInfo.union_id || feishuUserInfo.open_id;
      
      if (!feishuUserId) {
        console.error('[Feishu OAuth Callback API] 无法获取用户ID');
        throw new Error('无法获取用户唯一标识');
      }
      
      const result = await db.insert(users).values({
        feishuUserId: feishuUserId,
        feishuUnionId: feishuUserInfo.union_id,
        feishuOpenId: feishuUserInfo.open_id,
        name: feishuUserInfo.name,
        avatar: feishuUserInfo.avatar_thumb || feishuUserInfo.avatar_middle || feishuUserInfo.avatar_big || feishuUserInfo.avatar_url || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 查询刚插入的用户
      const newUsers = await db
        .select()
        .from(users)
        .where(eq(users.feishuUnionId, feishuUserInfo.union_id));
      
      dbUser = newUsers[0];
      console.log('[Feishu OAuth Callback API] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Feishu OAuth Callback API] 用户已存在，ID:', dbUser.id);
      // 更新用户信息
      await db.update(users)
        .set({
          feishuUserId: feishuUserInfo.user_id || dbUser.feishuUserId,
          name: feishuUserInfo.name,
          avatar: feishuUserInfo.avatar_thumb || feishuUserInfo.avatar_middle || feishuUserInfo.avatar_big || feishuUserInfo.avatar_url || '',
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));
    }

    // 4. 生成 JWT token
    console.log('[Feishu OAuth Callback API] 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: feishuUserInfo.union_id,
      name: feishuUserInfo.name,
    });

    // 5. 检查授权码绑定状态
    const feishuUserId = feishuUserInfo.union_id;
    console.log('[Feishu OAuth Callback API] 检查授权码绑定状态, union_id:', feishuUserId);
    
    // 查询该用户所有授权码
    const allLicenses = await db
      .select()
      .from(pluginLicenses)
      .where(eq(pluginLicenses.boundUserId, feishuUserId));
    
    console.log('[Feishu OAuth Callback API] 用户所有授权码数量:', allLicenses.length);

    // 查询有效授权码（状态为 active 且未过期）
    const now = new Date();
    
    const validLicensesResult = await db
      .select()
      .from(pluginLicenses)
      .where(and(
        eq(pluginLicenses.boundUserId, feishuUserId),
        eq(pluginLicenses.status, 'active'),
        gt(pluginLicenses.validUntil, now),
      ));

    // 过滤掉已过期但状态未更新的授权码
    const validLicenses = validLicensesResult.filter(l => {
      if (!l.validUntil) return false;
      return l.validUntil.getTime() > now.getTime();
    });

    const hasAuthorizations = validLicenses.length > 0;
    console.log('[Feishu OAuth Callback API] hasAuthorizations:', hasAuthorizations);

    // 6. 重定向到前端回调页面
    const callbackUrl = `/auth/callback?userId=${feishuUserId}&name=${encodeURIComponent(dbUser.name || '')}&hasAuthorizations=${hasAuthorizations}`;
    const fullUrl = new URL(callbackUrl, baseUrl);
    
    const response = NextResponse.redirect(fullUrl);
    
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    
    console.log('[Feishu OAuth Callback API] Cookie 已设置，准备重定向');
    return response;
  } catch (error) {
    console.error('[Feishu OAuth Callback API] 飞书 OAuth 回调错误:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl));
  }
}