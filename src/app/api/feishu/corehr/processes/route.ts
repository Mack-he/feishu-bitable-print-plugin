import { NextResponse } from 'next/server';
import { queryProcessInstances, getRecentProcessInstances, ProcessStatus } from '@/lib/feishu-corehr';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feishu/corehr/processes
 * 查询飞书 CoreHR 流程实例
 * 
 * 查询参数：
 * - mode: 'recent' | 'custom' (默认: 'recent')
 * - limit: 数量限制 (默认: 50)
 * - days: 查询最近多少天 (默认: 30)
 * - statuses: 状态过滤，逗号分隔 (如: "1,9")
 * - page_token: 分页标记
 * - page_size: 分页大小
 * - modify_time_from: 修改时间起始
 * - modify_time_to: 修改时间结束
 * - flow_definition_id: 流程定义ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'recent';

    console.log('[API] 查询流程实例，模式:', mode);

    if (mode === 'recent') {
      // 最近流程模式
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const days = parseInt(searchParams.get('days') || '30', 10);
      const statusesParam = searchParams.get('statuses');
      
      let statuses: ProcessStatus[] | undefined;
      if (statusesParam) {
        statuses = statusesParam.split(',').map(s => parseInt(s, 10) as ProcessStatus);
      }

      const processes = await getRecentProcessInstances({
        statuses,
        limit,
        days,
      });

      return NextResponse.json({
        success: true,
        data: processes,
      });
    } else {
      // 自定义查询模式
      const page_token = searchParams.get('page_token') || undefined;
      const page_size = parseInt(searchParams.get('page_size') || '50', 10);
      const modify_time_from = searchParams.get('modify_time_from');
      const modify_time_to = searchParams.get('modify_time_to');
      const flow_definition_id = searchParams.get('flow_definition_id') || undefined;
      const statusesParam = searchParams.get('statuses');

      if (!modify_time_from || !modify_time_to) {
        return NextResponse.json(
          { success: false, error: 'modify_time_from 和 modify_time_to 为必填参数' },
          { status: 400 }
        );
      }

      let statuses: ProcessStatus[] | undefined;
      if (statusesParam) {
        statuses = statusesParam.split(',').map(s => parseInt(s, 10) as ProcessStatus);
      }

      const result = await queryProcessInstances({
        statuses,
        page_token,
        page_size,
        modify_time_from,
        modify_time_to,
        flow_definition_id,
      });

      return NextResponse.json({
        success: true,
        data: result.items,
        page_token: result.page_token,
        has_more: result.has_more,
      });
    }
  } catch (error) {
    console.error('[API] 查询流程实例失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '查询失败' 
      },
      { status: 500 }
    );
  }
}

