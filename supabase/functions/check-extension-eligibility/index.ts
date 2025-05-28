import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CheckExtensionRequest {
  reservationId: string;
  extensionMinutes: number;
}

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

Deno.serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reservationId, extensionMinutes }: CheckExtensionRequest = await req.json();

    // 입력 검증
    if (!reservationId || !extensionMinutes) {
      return new Response(
        JSON.stringify({ error: '필수 파라미터가 누락되었습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (![30, 60, 90, 120].includes(extensionMinutes)) {
      return new Response(
        JSON.stringify({ error: '연장 시간은 30, 60, 90, 120분만 가능합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 예약 정보 조회
    const { data: reservation, error: reservationError } = await supabaseClient
      .from('reservations')
      .select(`
        id,
        customer_id,
        space_id,
        start_time,
        end_time,
        status,
        total_cost,
        updated_at,
        spaces (
          company_id,
          hourly_rate,
          companies (
            operating_hours
          )
        )
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      return new Response(
        JSON.stringify({ error: '예약을 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 예약 상태 확인
    if (!['confirmed', 'modified'].includes(reservation.status)) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: '연장 가능한 예약 상태가 아닙니다.',
          additionalCost: 0,
          timeDiscountAvailable: 0,
          operatingHours: { start: '09:00', end: '22:00' }
        } as CheckExtensionResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const endTime = new Date(reservation.end_time);
    const gracePeriodEnd = new Date(endTime.getTime() + 10 * 60 * 1000); // 10분 Grace Period

    // Grace Period 확인
    if (now > gracePeriodEnd) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: 'Grace Period(10분)가 만료되었습니다.',
          gracePeriodRemaining: 0,
          additionalCost: 0,
          timeDiscountAvailable: 0,
          operatingHours: { start: '09:00', end: '22:00' }
        } as CheckExtensionResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 연장 후 종료 시간 계산
    const newEndTime = new Date(endTime.getTime() + extensionMinutes * 60 * 1000);

    // 운영시간 확인 (09:00-22:00)
    const endHour = newEndTime.getHours();
    if (endHour >= 22) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: '연장 시간이 운영시간(22:00)을 초과합니다.',
          additionalCost: 0,
          timeDiscountAvailable: 0,
          operatingHours: { start: '09:00', end: '22:00' }
        } as CheckExtensionResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 다음 예약과의 충돌 확인
    const { data: conflictingReservations } = await supabaseClient
      .from('reservations')
      .select('id, start_time')
      .eq('space_id', reservation.space_id)
      .gte('start_time', reservation.end_time)
      .lt('start_time', newEndTime.toISOString())
      .in('status', ['confirmed', 'modified']);

    if (conflictingReservations && conflictingReservations.length > 0) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: '연장하려는 시간대에 이미 다른 예약이 있습니다.',
          nextReservationStartTime: conflictingReservations[0].start_time,
          additionalCost: 0,
          timeDiscountAvailable: 0,
          operatingHours: { start: '09:00', end: '22:00' }
        } as CheckExtensionResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 요금 계산
    const hourlyRate = reservation.spaces?.hourly_rate || 30000;
    const additionalCost = (extensionMinutes / 60) * hourlyRate;

    // 고객의 적립 시간 조회
    const { data: customer } = await supabaseClient
      .from('customers')
      .select('accumulated_time_minutes')
      .eq('id', reservation.customer_id)
      .single();

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

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-extension-eligibility:', error);
    return new Response(
      JSON.stringify({ error: error.message || '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 