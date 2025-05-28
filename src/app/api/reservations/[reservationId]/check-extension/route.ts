import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CheckExtensionResponse {
  eligible: boolean;
  reason?: string;
  gracePeriodRemaining?: number;
  nextReservationStartTime?: string;
  operatingHours: {
    start: string;
    end: string;
  };
  additionalCost: number;
  timeDiscountAvailable: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await params;
    const body = await request.json();
    const { extensionMinutes } = body;

    console.log('[check-extension] 요청 수신:', { reservationId, extensionMinutes });

    // 입력 검증
    if (!extensionMinutes || ![30, 60, 90, 120].includes(extensionMinutes)) {
      console.log('[check-extension] 입력 검증 실패:', extensionMinutes);
      return NextResponse.json(
        { error: '연장 시간은 30, 60, 90, 120분만 가능합니다.' },
        { status: 400 }
      );
    }

    // 먼저 기본 예약 정보만 조회해보기
    const { data: basicReservation, error: basicError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    console.log('[check-extension] 기본 예약 조회:', { basicReservation, basicError });

    if (basicError || !basicReservation) {
      console.log('[check-extension] 예약을 찾을 수 없음:', basicError);
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // services 테이블에서 service 정보 조회
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price_per_hour')
      .eq('id', basicReservation.service_id)
      .single();

    console.log('[check-extension] 서비스 조회:', { serviceData, serviceError });

    // 예약 상태 확인
    if (!['confirmed', 'modified'].includes(basicReservation.status)) {
      console.log('[check-extension] 연장 불가능한 상태:', basicReservation.status);
      const response: CheckExtensionResponse = {
        eligible: false,
        reason: '연장 가능한 예약 상태가 아닙니다.',
        additionalCost: 0,
        timeDiscountAvailable: 0,
        operatingHours: { start: '09:00', end: '22:00' }
      };
      return NextResponse.json(response);
    }

    const now = new Date();
    const reservationDate = basicReservation.reservation_date;
    const endTime = new Date(`${reservationDate}T${basicReservation.end_time}`);
    const gracePeriodEnd = new Date(endTime.getTime() + 10 * 60 * 1000); // 10분 Grace Period

    console.log('[check-extension] 시간 확인:', { 
      now: now.toISOString(), 
      endTime: endTime.toISOString(), 
      gracePeriodEnd: gracePeriodEnd.toISOString() 
    });

    // Grace Period 확인
    if (now > gracePeriodEnd) {
      const response: CheckExtensionResponse = {
        eligible: false,
        reason: 'Grace Period(10분)가 만료되었습니다.',
        gracePeriodRemaining: 0,
        additionalCost: 0,
        timeDiscountAvailable: 0,
        operatingHours: { start: '09:00', end: '22:00' }
      };
      return NextResponse.json(response);
    }

    // 연장 후 종료 시간 계산
    const newEndTime = new Date(endTime.getTime() + extensionMinutes * 60 * 1000);

    // 운영시간 확인 (09:00-22:00)
    const endHour = newEndTime.getHours();
    if (endHour >= 22) {
      const response: CheckExtensionResponse = {
        eligible: false,
        reason: '연장 시간이 운영시간(22:00)을 초과합니다.',
        additionalCost: 0,
        timeDiscountAvailable: 0,
        operatingHours: { start: '09:00', end: '22:00' }
      };
      return NextResponse.json(response);
    }

    // 다음 예약과의 충돌 확인
    const { data: conflictingReservations } = await supabase
      .from('reservations')
      .select('id, start_time')
      .eq('service_id', basicReservation.service_id)
      .eq('reservation_date', reservationDate)
      .gte('start_time', basicReservation.end_time)
      .lt('start_time', newEndTime.toTimeString().substring(0, 5))
      .in('status', ['confirmed', 'modified']);

    console.log('[check-extension] 충돌 예약 확인:', conflictingReservations);

    if (conflictingReservations && conflictingReservations.length > 0) {
      const response: CheckExtensionResponse = {
        eligible: false,
        reason: '연장하려는 시간대에 이미 다른 예약이 있습니다.',
        nextReservationStartTime: conflictingReservations[0].start_time,
        additionalCost: 0,
        timeDiscountAvailable: 0,
        operatingHours: { start: '09:00', end: '22:00' }
      };
      return NextResponse.json(response);
    }

    // 요금 계산 (서비스 가격을 사용, 없으면 기본값)
    const hourlyRate = serviceData?.price_per_hour || 30000;
    const additionalCost = (extensionMinutes / 60) * hourlyRate;

    console.log('[check-extension] 요금 계산:', { hourlyRate, additionalCost });

    // 고객의 적립 시간 조회
    const { data: customer } = await supabase
      .from('customers')
      .select('accumulated_time_minutes')
      .eq('id', basicReservation.customer_id)
      .single();

    console.log('[check-extension] 고객 적립 시간:', customer);

    const accumulatedMinutes = customer?.accumulated_time_minutes || 0;
    const timeDiscountAvailable = Math.min(accumulatedMinutes, extensionMinutes);

    // Grace Period 남은 시간 계산
    const gracePeriodRemaining = Math.max(0, Math.floor((gracePeriodEnd.getTime() - now.getTime()) / 1000));

    const response: CheckExtensionResponse = {
      eligible: true,
      gracePeriodRemaining,
      operatingHours: { start: '09:00', end: '22:00' },
      additionalCost,
      timeDiscountAvailable
    };

    console.log('[check-extension] 성공 응답:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[check-extension] API 라우트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 