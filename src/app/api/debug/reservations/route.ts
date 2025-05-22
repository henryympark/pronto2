import { NextResponse } from 'next/server';
import { createClient$ } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Supabase MCP 클라이언트 생성
    const supabase = createClient$();
    
    // 현재 로그인한 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: '인증되지 않은 사용자입니다.', 
        authError 
      }, { status: 401 });
    }
    
    // 사용자의 예약 정보 조회
    const { data: reservations, error: queryError } = await supabase
      .from('reservations')
      .select(`
        id,
        service_id,
        customer_id,
        reservation_date,
        start_time,
        end_time,
        total_hours,
        total_price,
        status,
        customer_name,
        created_at,
        updated_at,
        paid_amount,
        refunded,
        refunded_at,
        service:services(id, name),
        company_name,
        shooting_purpose,
        vehicle_number
      `)
      .eq('customer_id', user.id)
      .order('reservation_date', { ascending: false });
    
    if (queryError) {
      return NextResponse.json({ 
        error: '예약 정보 조회 실패', 
        queryError 
      }, { status: 500 });
    }
    
    // 결과 반환
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      reservationsCount: reservations?.length || 0,
      reservations: reservations || [],
    });
    
  } catch (error) {
    console.error('예약 정보 디버깅 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 