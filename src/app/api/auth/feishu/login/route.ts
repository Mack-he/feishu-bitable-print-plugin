import { NextResponse } from 'next/server';
import { getOAuthUrl } from '@/lib/feishu-oauth';

export const dynamic = 'force-dynamic';

// 飞书 OAuth 登录 - 重定向到飞书授权页面
export async function GET() {
  try {
    console.log('[Feishu OAuth Login API] 生成 OAuth 授权 URL');
    
    // 生成随机 state
    const state = Math.random().toString(36).substring(2, 15);
    
    // 生成 OAuth 授权 URL（现在是异步函数）
    const oauthUrl = await getOAuthUrl(state);
    
    console.log('[Feishu OAuth Login API] 重定向到:', oauthUrl);
    
    // 重定向到飞书授权页面
    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    console.error('[Feishu OAuth Login API] 错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '生成授权链接失败' },
      { status: 500 }
    );
  }
}
