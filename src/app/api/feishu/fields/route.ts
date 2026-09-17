/**
 * 飞书字段列表 API
 * GET /api/feishu/fields?appToken=xxx&tableId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeishuAPIClient } from '@/lib/feishu-api-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appToken = searchParams.get('appToken');
    const tableId = searchParams.get('tableId');

    if (!appToken || !tableId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: appToken 或 tableId' },
        { status: 400 }
      );
    }

    const client = getFeishuAPIClient();
    const fields = await client.getFields(appToken, tableId);

    return NextResponse.json({
      success: true,
      fields,
    });
  } catch (error) {
    console.error('[获取字段列表失败]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取字段列表失败',
      },
      { status: 500 }
    );
  }
}
