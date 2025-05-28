import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExtendReservationRequest {
  extensionMinutes: number;
  useAccumulatedTime: boolean;
  useCoupons: string[];
}

interface ExtendReservationResponse {
  success: boolean;
  message?: string;
  error?: string;
  updatedReservation?: any;
  timeUsed?: {
    accumulated: number;
    coupons: any[];
  };
  additionalPaymentRequired?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await params;
    const body: ExtendReservationRequest = await request.json();
    const { extensionMinutes, useAccumulatedTime, useCoupons } = body;

    console.log('[extend] 요청 수신:', { reservationId, extensionMinutes, useAccumulatedTime, useCoupons });

    // 입력 검증
    if (!extensionMinutes || ![30, 60, 90, 120].includes(extensionMinutes)) {
      return NextResponse.json(
        { success: false, error: '연장 시간은 30, 60, 90, 120분만 가능합니다.' },
        { status: 400 }
      );
    }

    // 예약 정보 조회
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    console.log('[extend] 예약 조회:', { reservation, reservationError });

    if (reservationError || !reservation) {
      return NextResponse.json(
        { success: false, error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // services 테이블에서 service 정보 조회
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price_per_hour')
      .eq('id', reservation.service_id)
      .single();

    console.log('[extend] 서비스 조회:', { serviceData, serviceError });

    if (serviceError || !serviceData) {
      return NextResponse.json(
        { success: false, error: '서비스 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 예약 상태 및 Grace Period 재확인
    if (!['confirmed', 'modified'].includes(reservation.status)) {
      return NextResponse.json(
        { success: false, error: '연장 가능한 예약 상태가 아닙니다.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const reservationDate = reservation.reservation_date;
    const endTime = new Date(`${reservationDate}T${reservation.end_time}`);
    const gracePeriodEnd = new Date(endTime.getTime() + 10 * 60 * 1000);

    if (now > gracePeriodEnd) {
      return NextResponse.json(
        { success: false, error: 'Grace Period(10분)가 만료되었습니다.' },
        { status: 400 }
      );
    }

    // 연장 후 종료 시간 계산
    const newEndTime = new Date(endTime.getTime() + extensionMinutes * 60 * 1000);

    // 운영시간 확인
    if (newEndTime.getHours() >= 22) {
      return NextResponse.json(
        { success: false, error: '연장 시간이 운영시간(22:00)을 초과합니다.' },
        { status: 400 }
      );
    }

    // 충돌 검사
    const { data: conflictingReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('service_id', reservation.service_id)
      .eq('reservation_date', reservationDate)
      .gte('start_time', reservation.end_time)
      .lt('start_time', newEndTime.toTimeString().substring(0, 5))
      .in('status', ['confirmed', 'modified']);

    if (conflictingReservations && conflictingReservations.length > 0) {
      return NextResponse.json(
        { success: false, error: '연장하려는 시간대에 이미 다른 예약이 있습니다.' },
        { status: 400 }
      );
    }

    // 비용 계산
    const hourlyRate = serviceData.price_per_hour || 30000;
    const totalCost = (extensionMinutes / 60) * hourlyRate;

    let usedAccumulatedMinutes = 0;
    const usedCoupons: any[] = [];
    let remainingCost = totalCost;

    // 적립 시간 사용
    if (useAccumulatedTime) {
      const { data: customer } = await supabase
        .from('customers')
        .select('accumulated_time_minutes')
        .eq('id', reservation.customer_id)
        .single();

      if (customer && customer.accumulated_time_minutes > 0) {
        usedAccumulatedMinutes = Math.min(customer.accumulated_time_minutes, extensionMinutes);
        const accumulatedDiscount = (usedAccumulatedMinutes / 60) * hourlyRate;
        remainingCost -= accumulatedDiscount;

        // 적립 시간 차감
        await supabase
          .from('customers')
          .update({ 
            accumulated_time_minutes: customer.accumulated_time_minutes - usedAccumulatedMinutes 
          })
          .eq('id', reservation.customer_id);
      }
    }

    // 쿠폰 사용 (여기서는 기본 구현만)
    if (useCoupons && useCoupons.length > 0) {
      for (const couponId of useCoupons) {
        const { data: coupon, error: couponError } = await supabase
          .from('customer_coupons')
          .select('minutes')
          .eq('id', couponId)
          .eq('customer_id', reservation.customer_id)
          .eq('is_used', false)
          .single();

        if (!couponError && coupon) {
          const couponValue = (coupon.minutes / 60) * hourlyRate;
          remainingCost = Math.max(0, remainingCost - couponValue);
          
          // 쿠폰 사용 처리
          await supabase
            .from('customer_coupons')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', couponId);

          usedCoupons.push({ id: couponId, minutes: coupon.minutes });
        }
      }
    }

    // 예약 시간 업데이트
    const { data: updatedReservation, error: updateError } = await supabase
      .from('reservations')
      .update({ 
        end_time: newEndTime.toTimeString().substring(0, 5),
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: '예약 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 이력 기록
    await supabase.from('reservation_history').insert({
      reservation_id: reservationId,
      action_type: 'extended',
      action_details: {
        extensionMinutes,
        totalCost,
        usedAccumulatedMinutes,
        usedCoupons,
        additionalPaymentRequired: Math.max(0, remainingCost)
      },
      performed_at: new Date().toISOString()
    });

    const response: ExtendReservationResponse = {
      success: true,
      message: `예약이 ${extensionMinutes}분 연장되었습니다.`,
      updatedReservation,
      timeUsed: {
        accumulated: usedAccumulatedMinutes,
        coupons: usedCoupons
      },
      additionalPaymentRequired: Math.max(0, remainingCost)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API 라우트 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 