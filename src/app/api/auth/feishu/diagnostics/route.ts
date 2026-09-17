import { NextResponse } from 'next/server';
import { getSystemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

// 诊断飞书 OAuth 配置
export async function GET() {
  try {
    const appId = await getSystemConfig('FEISHU_APP_ID');
    const redirectUri = await getSystemConfig('FEISHU_REDIRECT_URI');

    const diagnostics = {
      configured: {
        appId: !!appId,
        redirectUri: !!redirectUri,
      },
      values: {
        appId: appId ? `${appId.substring(0, 8)}...` : null,
        redirectUri: redirectUri || null,
      },
      checks: {
        // 检查 redirect_uri 格式
        redirectUriFormat: redirectUri ? {
          hasProtocol: redirectUri.startsWith('http://') || redirectUri.startsWith('https://'),
          noQueryParams: !redirectUri.includes('?'),
          noHash: !redirectUri.includes('#'),
        } : null,
        // 常见问题提示
        commonIssues: [] as string[],
      },
      suggestions: [] as string[],
    };

    // 检查常见问题
    if (!appId) {
      diagnostics.checks.commonIssues.push('FEISHU_APP_ID 未配置');
      diagnostics.suggestions.push('在管理后台或环境变量中配置 FEISHU_APP_ID');
    }

    if (!redirectUri) {
      diagnostics.checks.commonIssues.push('FEISHU_REDIRECT_URI 未配置');
      diagnostics.suggestions.push('在管理后台或环境变量中配置 FEISHU_REDIRECT_URI');
    } else {
      if (!diagnostics.checks.redirectUriFormat?.hasProtocol) {
        diagnostics.checks.commonIssues.push('redirect_uri 必须包含协议（http:// 或 https://）');
      }
      if (!diagnostics.checks.redirectUriFormat?.noQueryParams) {
        diagnostics.checks.commonIssues.push('redirect_uri 不能包含查询参数');
      }
      if (!diagnostics.checks.redirectUriFormat?.noHash) {
        diagnostics.checks.commonIssues.push('redirect_uri 不能包含 hash (#)');
      }
    }

    // 飞书开放平台配置建议
    diagnostics.suggestions.push(
      '1. 登录飞书开放平台 (https://open.feishu.cn/)',
      '2. 进入你的应用 → 安全设置',
      '3. 在「重定向 URL」中添加以下地址：',
      redirectUri || '(未配置)',
      '4. 确保地址完全一致（包括协议、域名、端口、路径）',
      '5. 如果是多维表格插件，请确保使用插件专属的重定向配置'
    );

    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    console.error('[Feishu OAuth Diagnostics] 错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '诊断失败' },
      { status: 500 }
    );
  }
}
