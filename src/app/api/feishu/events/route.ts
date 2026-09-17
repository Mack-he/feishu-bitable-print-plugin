/**
 * 飞书事件流 API (Server-Sent Events)
 * GET /api/feishu/events?appToken=xxx&tableId=xxx&types=selection_change,record_change
 * 
 * 注意：这是一个简化的SSE实现，用于演示目的
 * 实际生产环境需要结合飞书事件订阅或WebSocket
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge'; // 使用 Edge Runtime 支持流式响应

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appToken = searchParams.get('appToken');
  const tableId = searchParams.get('tableId');
  const types = searchParams.get('types')?.split(',') || ['selection_change'];

  if (!appToken || !tableId) {
    return new Response(
      JSON.stringify({ error: '缺少必要参数: appToken 或 tableId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 创建 TransformStream 用于 SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接成功事件
      const connectEvent = {
        type: 'connected',
        data: { appToken, tableId },
        timestamp: Date.now(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`));

      // 定期发送心跳事件（保持连接）
      intervalId = setInterval(() => {
        try {
          const heartbeatEvent = {
            type: 'heartbeat',
            data: {},
            timestamp: Date.now(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeatEvent)}\n\n`));
        } catch (error) {
          // 客户端已断开连接
          clearInterval(intervalId);
        }
      }, 30000); // 每30秒发送一次心跳

      // 注意：实际的选中变化事件需要从客户端通过其他方式传递
      // 这里只是一个占位实现
    },
    cancel() {
      // 客户端断开连接
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * 客户端如何推送选中变化事件？
 * 
 * 由于SSE是单向的（服务器到客户端），客户端需要通过其他方式通知服务器：
 * 
 * 方案1: 创建一个单独的API端点接收事件
 * POST /api/feishu/events/push
 * Body: { appToken, tableId, type: 'selection_change', data: {...} }
 * 
 * 方案2: 使用WebSocket（双向通信）
 * 
 * 方案3: 在前端直接处理选中变化，不通过SSE
 */
