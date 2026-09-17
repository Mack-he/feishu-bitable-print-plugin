/**
 * 飞书配置调试 API
 * GET /api/feishu/debug
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  // 检查环境变量是否配置
  const hasAppId = !!appId && appId !== 'your_app_id';
  const hasAppSecret = !!appSecret && appSecret !== 'your_app_secret';

  // 脱敏显示
  const maskedAppId = appId ? `${appId.slice(0, 4)}****${appId.slice(-4)}` : '未设置';
  const maskedSecret = appSecret ? `${appSecret.slice(0, 4)}****` : '未设置';

  return NextResponse.json({
    config: {
      appId: maskedAppId,
      appSecret: maskedSecret,
      hasAppId,
      hasAppSecret,
      isConfigured: hasAppId && hasAppSecret,
    },
    status: hasAppId && hasAppSecret ? 'configured' : 'not_configured',
    message: hasAppId && hasAppSecret 
      ? '飞书应用凭证已正确配置' 
      : '请设置正确的 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量',
  });
}
