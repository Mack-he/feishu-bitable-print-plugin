import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 处理飞书 OAuth 回调重定向
  // 将 /auth/feishu/callback 重定向到 /api/auth/feishu/callback
  if (pathname === '/auth/feishu/callback' || pathname === '/auth/feishu/callback/') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/auth/feishu/callback';
    console.log('[Middleware] 重定向飞书回调:', pathname, '->', url.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/feishu/callback', '/auth/feishu/callback/'],
};
