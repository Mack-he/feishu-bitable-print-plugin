/**
 * 飞书记录 API
 * GET /api/feishu/records?appToken=xxx&tableId=xxx&recordId=xxx (获取单条记录)
 * POST /api/feishu/records (批量获取或搜索记录)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeishuAPIClient } from '@/lib/feishu-api-client';

/**
 * GET - 获取单条记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appToken = searchParams.get('appToken');
    const tableId = searchParams.get('tableId');
    const recordId = searchParams.get('recordId');

    if (!appToken || !tableId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: appToken 或 tableId' },
        { status: 400 }
      );
    }

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: recordId' },
        { status: 400 }
      );
    }

    const client = getFeishuAPIClient();
    const record = await client.getRecord(appToken, tableId, recordId);

    if (!record) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('[获取记录失败]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取记录失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - 批量获取记录或搜索记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appToken, tableId, recordIds, viewId, filter, sort, processFields } = body;

    if (!appToken || !tableId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: appToken 或 tableId' },
        { status: 400 }
      );
    }

    const client = getFeishuAPIClient();

    let records;

    if (recordIds && Array.isArray(recordIds) && recordIds.length > 0) {
      // 批量获取指定记录
      records = await client.getRecords(appToken, tableId, recordIds);
    } else if (viewId || filter) {
      // 搜索记录
      records = await client.searchRecords(
        appToken,
        tableId,
        viewId,
        filter ? JSON.stringify(filter) : undefined,
        sort
      );
    } else {
      // 获取所有记录
      records = await client.getRecords(appToken, tableId);
    }

    // 如果需要处理字段（解析字段ID到字段名）
    if (processFields && records.length > 0) {
      const fields = await client.getFields(appToken, tableId);
      const fieldIdToName = new Map(fields.map(f => [f.id, f.name]));

      records = records.map(record => {
        const processedFields: Record<string, unknown> = {};
        for (const [fieldId, value] of Object.entries(record.fields)) {
          const fieldName = fieldIdToName.get(fieldId) || fieldId;
          processedFields[fieldName] = value;
        }
        return {
          ...record,
          fields: processedFields,
        };
      });
    }

    return NextResponse.json({
      success: true,
      records,
      total: records.length,
    });
  } catch (error) {
    console.error('[获取记录失败]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取记录失败',
      },
      { status: 500 }
    );
  }
}
