import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REWARD_MINUTES = 10; // 리뷰 작성 시 적립해줄 시간 (10분)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id, review_id, reservation_id } = body;

    // 필수 파라미터 검증
    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: customer_id' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. 고객 정보 조회
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, accumulated_time_minutes')
      .eq('id', customer_id)
      .single();

    if (customerError || !customerData) {
      console.error('고객 조회 오류:', customerError);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // 2. 적립 시간 업데이트
    const newAccumulatedTime = (customerData.accumulated_time_minutes || 0) + REWARD_MINUTES;
    
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({ 
        accumulated_time_minutes: newAccumulatedTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer_id)
      .select('id, accumulated_time_minutes, updated_at')
      .single();

    if (updateError) {
      console.error('적립시간 업데이트 오류:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update accumulated time' },
        { status: 500 }
      );
    }

    // 3. 성공 응답
    return NextResponse.json({
      success: true,
      message: `Successfully rewarded ${REWARD_MINUTES} minutes for review`,
      data: {
        customer_id,
        review_id,
        rewarded_minutes: REWARD_MINUTES,
        accumulated_time_minutes: newAccumulatedTime,
        updated_at: updatedCustomer?.updated_at || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API 라우트 오류:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 