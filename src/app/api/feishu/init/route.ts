/**
 * 飞书初始化 API
 * POST /api/feishu/init
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeishuAPIClient } from '@/lib/feishu-api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appToken, tableId } = body;

    if (!appToken || !tableId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: appToken 或 tableId' },
        { status: 400 }
      );
    }

    const client = getFeishuAPIClient();
    const result = await client.init(appToken, tableId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[飞书初始化失败]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '初始化失败',
      },
      { status: 500 }
    );
  }
}
