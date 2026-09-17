import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 输出到服务器日志
    console.log('🔍 [DEBUG LOG]', JSON.stringify(body, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DEBUG LOG] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
