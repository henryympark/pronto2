import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Supabase webhook-dispatcher Edge Function의 GET 엔드포인트 호출 (배치 재시도)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/webhook-dispatcher`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Batch webhook retry failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      processed: result.processed,
      success_count: result.success_count,
      failed_count: result.failed_count,
    });

  } catch (error) {
    console.error('배치 웹훅 재시도 API 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 