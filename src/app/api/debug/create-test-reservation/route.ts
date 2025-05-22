import { NextResponse } from 'next/server';
import { createClient$ } from '@/lib/supabase';
import { addDays, format } from 'date-fns';

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
    
    // 테스트용 서비스 ID 조회
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id')
      .limit(1);
    
    if (serviceError || !services || services.length === 0) {
      return NextResponse.json({ 
        error: '서비스 정보가 없습니다. 먼저 서비스를 생성해주세요.', 
        serviceError 
      }, { status: 404 });
    }
    
    const serviceId = services[0].id;
    const now = new Date();
    
    // 필드 존재 여부 확인
    let hasRefundColumns = false;
    
    try {
      // 이 함수가 없을 수 있으므로 try/catch로 감싸서 처리
      const { data: columnsInfo, error: columnsError } = await supabase
        .rpc('check_columns_exist', { 
          p_table_name: 'reservations',
          p_column_names: ['paid_amount', 'refunded', 'refunded_at']
        });
      
      if (columnsError) {
        console.error('컬럼 존재 여부 확인 실패:', columnsError);
      } else {
        hasRefundColumns = columnsInfo?.all_exist || false;
      }
    } catch (error) {
      console.warn('컬럼 존재 여부 확인 함수가 없습니다:', error);
    }
    
    console.log('환불 관련 컬럼 존재 여부:', hasRefundColumns);
    
    // 기본 예약 타입 정의
    type BaseReservation = {
      service_id: string;
      customer_id: string;
      reservation_date: string;
      start_time: string;
      end_time: string;
      total_hours: number;
      total_price: number;
      status: string;
      customer_name: string;
    };
    
    // 환불 필드가 있는 예약 타입 정의
    type RefundableReservation = BaseReservation & {
      paid_amount?: number;
      refunded?: boolean;
      refunded_at?: string | null;
    };
    
    // 테스트 예약 데이터 생성
    const testReservations: RefundableReservation[] = [
      // 1. 이용 예정 예약 (confirmed, 미래 날짜)
      {
        service_id: serviceId,
        customer_id: user.id,
        reservation_date: format(addDays(now, 3), 'yyyy-MM-dd'),
        start_time: '14:00:00',
        end_time: '16:00:00',
        total_hours: 2,
        total_price: 40000,
        status: 'confirmed',
        customer_name: user.user_metadata?.name || '테스트 사용자'
      },
      // 2. 이용 완료 예약 (confirmed, 과거 날짜)
      {
        service_id: serviceId,
        customer_id: user.id,
        reservation_date: format(addDays(now, -5), 'yyyy-MM-dd'),
        start_time: '10:00:00',
        end_time: '12:00:00',
        total_hours: 2,
        total_price: 40000,
        status: 'confirmed',
        customer_name: user.user_metadata?.name || '테스트 사용자'
      },
      // 3. 취소된 예약
      {
        service_id: serviceId,
        customer_id: user.id,
        reservation_date: format(addDays(now, -2), 'yyyy-MM-dd'),
        start_time: '13:00:00',
        end_time: '14:00:00',
        total_hours: 1,
        total_price: 20000,
        status: 'cancelled',
        customer_name: user.user_metadata?.name || '테스트 사용자'
      }
    ];
    
    // 환불 관련 필드가 있는 경우에만 추가 데이터 설정
    if (hasRefundColumns) {
      // 첫 번째 예약에 결제 정보 추가
      Object.assign(testReservations[0], {
        paid_amount: 40000,
        refunded: false,
        refunded_at: null
      });
      
      // 두 번째 예약에 결제 정보 추가
      Object.assign(testReservations[1], {
        paid_amount: 40000,
        refunded: false,
        refunded_at: null
      });
      
      // 세 번째 예약에 환불 완료 정보 추가
      Object.assign(testReservations[2], {
        paid_amount: 20000,
        refunded: true,
        refunded_at: format(addDays(now, -1), 'yyyy-MM-dd HH:mm:ss')
      });
      
      // 추가 취소 예약 생성 (환불 처리 중)
      testReservations.push({
        service_id: serviceId,
        customer_id: user.id,
        reservation_date: format(addDays(now, 1), 'yyyy-MM-dd'),
        start_time: '15:00:00',
        end_time: '16:00:00',
        total_hours: 1,
        total_price: 20000,
        status: 'cancelled',
        customer_name: user.user_metadata?.name || '테스트 사용자',
        paid_amount: 20000,
        refunded: false,
        refunded_at: null
      });
      
      // 추가 취소 예약 생성 (환불 대상 아님)
      testReservations.push({
        service_id: serviceId,
        customer_id: user.id,
        reservation_date: format(addDays(now, 2), 'yyyy-MM-dd'),
        start_time: '17:00:00',
        end_time: '18:00:00',
        total_hours: 1,
        total_price: 0, // 무료 예약
        status: 'cancelled',
        customer_name: user.user_metadata?.name || '테스트 사용자',
        paid_amount: 0,
        refunded: false,
        refunded_at: null
      });
    }
    
    // 데이터베이스에 테스트 예약 데이터 삽입
    const { data: insertResult, error: insertError } = await supabase
      .from('reservations')
      .insert(testReservations)
      .select();
    
    if (insertError) {
      return NextResponse.json({ 
        error: '테스트 예약 데이터 생성 실패', 
        insertError 
      }, { status: 500 });
    }
    
    // 결과 반환
    return NextResponse.json({
      success: true,
      message: '테스트 예약 데이터가 성공적으로 생성되었습니다.',
      count: insertResult?.length || 0,
      hasRefundColumns,
      insertResult
    });
    
  } catch (error) {
    console.error('테스트 예약 데이터 생성 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 