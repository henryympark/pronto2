import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 요청 타입 인터페이스
interface ExtendReservationRequest {
  extensionMinutes: number; // 연장할 분 수 (30의 배수)
  useAccumulatedTime: boolean; // 적립 시간 사용 여부
  useCoupons: string[]; // 사용할 쿠폰 ID 배열
}

// 쿠폰 사용 정보 타입
interface CouponUsage {
  couponId: string;
  minutes: number;
}

// 응답 타입 인터페이스
interface ExtendReservationResponse {
  success: boolean;
  message?: string;
  error?: string;
  updatedReservation?: any;
  timeUsed?: {
    accumulated: number; // 사용된 적립 시간 (분)
    coupons: CouponUsage[]; // 사용된 쿠폰들
  };
  additionalPaymentRequired?: number; // 추가 결제 필요 금액
}

// 웹훅 이벤트 페이로드 타입
interface BookingExtendedWebhookPayload {
  event: 'booking.extended';
  timestamp: string;
  data: {
    reservationId: string;
    customerId: string;
    originalEndTime: string;
    newEndTime: string;
    extensionMinutes: number;
    additionalCost: number;
    timeUsed: {
      accumulated: number;
      coupons: CouponUsage[];
    };
  };
}

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

// 상수
const GRACE_PERIOD_MINUTES = 10; // Grace Period 10분
const EXTENSION_UNIT_MINUTES = 30; // 연장 단위 30분
const OPERATION_START_TIME = '09:00';
const OPERATION_END_TIME = '22:00';

// 시간 유틸리티 함수들
const parseTimeString = (timeString: string, date: Date): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const formatTimeString = (date: Date): string => {
  return date.toTimeString().slice(0, 5); // HH:MM 형식
};

const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

const getRemainingGracePeriodMinutes = (reservationEndDateTime: Date): number => {
  const now = new Date();
  const gracePeriodEnd = addMinutes(reservationEndDateTime, GRACE_PERIOD_MINUTES);
  
  if (now > gracePeriodEnd) {
    return 0; // Grace Period 종료
  }
  
  if (now < reservationEndDateTime) {
    return GRACE_PERIOD_MINUTES; // 아직 예약 시간 중이므로 전체 Grace Period 가용
  }
  
  // 예약 종료 후 Grace Period 내
  const diffMs = gracePeriodEnd.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60)); // 분 단위로 변환
};

const createReservationDateTime = (reservationDate: string, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(reservationDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const isValidExtensionTime = (extensionMinutes: number): boolean => {
  return extensionMinutes > 0 && extensionMinutes % EXTENSION_UNIT_MINUTES === 0;
};

const isWithinOperatingHours = (startTime: Date, endTime: Date): boolean => {
  const operationStart = parseTimeString(OPERATION_START_TIME, startTime);
  const operationEnd = parseTimeString(OPERATION_END_TIME, startTime);
  
  return startTime >= operationStart && endTime <= operationEnd;
};

// Supabase Edge Function
Deno.serve(async (req: Request) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST 메서드 체크
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  try {
    // URL에서 reservationId 추출
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const reservationId = pathParts[pathParts.indexOf('reservations') + 1];
    
    if (!reservationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing reservation ID in URL path' 
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 요청 바디 파싱
    const { 
      extensionMinutes, 
      useAccumulatedTime = false, 
      useCoupons = [] 
    } = await req.json() as ExtendReservationRequest;

    // 필수 파라미터 검증
    if (!extensionMinutes) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required field: extensionMinutes'
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 연장 시간 검증 (30분 단위)
    if (!isValidExtensionTime(extensionMinutes)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '연장 시간은 30분 단위로만 가능합니다.'
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. 예약 정보 및 관련 데이터 조회
    const { data: reservationData, error: reservationError } = await supabaseClient
      .from('reservations')
      .select(`
        id,
        customer_id,
        service_id,
        reservation_date,
        start_time,
        end_time,
        total_hours,
        total_price,
        status,
        services!inner(
          name,
          price_per_hour,
          location
        ),
        customers!inner(
          accumulated_time_minutes
        )
      `)
      .eq('id', reservationId)
      .eq('status', 'confirmed')
      .single();

    if (reservationError || !reservationData) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '예약을 찾을 수 없거나 이미 완료된 예약입니다.'
        }),
        { 
          status: 404, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 2. Grace Period 확인
    const reservationEndDateTime = createReservationDateTime(
      reservationData.reservation_date, 
      reservationData.end_time
    );

    const gracePeriodRemaining = getRemainingGracePeriodMinutes(reservationEndDateTime);
    
    if (gracePeriodRemaining <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '연장 가능 시간(Grace Period)이 만료되었습니다.'
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 3. 연장된 종료 시간 계산 및 운영시간 확인
    const extendedEndDateTime = addMinutes(reservationEndDateTime, extensionMinutes);
    const extendedEndTimeString = formatTimeString(extendedEndDateTime);

    if (!isWithinOperatingHours(reservationEndDateTime, extendedEndDateTime)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '연장 시간이 운영시간을 초과합니다.'
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 4. 실시간 가용성 재확인 (동시성 대응)
    const { data: conflictingReservations, error: conflictError } = await supabaseClient
      .from('reservations')
      .select('id')
      .eq('service_id', reservationData.service_id)
      .eq('reservation_date', reservationData.reservation_date)
      .eq('status', 'confirmed')
      .neq('id', reservationId)
      .gte('end_time', reservationData.end_time)
      .lte('start_time', extendedEndTimeString);

    if (conflictError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '예약 가용성 확인 중 오류가 발생했습니다.'
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    if (conflictingReservations && conflictingReservations.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '연장하려는 시간대에 이미 다른 예약이 있습니다.'
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 5. 쿠폰 정보 조회 및 검증
    let customerCoupons: any[] = [];
    if (useCoupons.length > 0) {
      const { data: couponsData, error: couponsError } = await supabaseClient
        .from('customer_coupons')
        .select('id, time_minutes, expiry_date')
        .eq('customer_id', reservationData.customer_id)
        .eq('is_used', false)
        .in('id', useCoupons)
        .gte('expiry_date', new Date().toISOString().split('T')[0]);

      if (couponsError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: '쿠폰 정보 조회 중 오류가 발생했습니다.'
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json' 
            } 
          }
        );
      }

      customerCoupons = couponsData || [];
      
      // 요청된 쿠폰이 모두 유효한지 확인
      if (customerCoupons.length !== useCoupons.length) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: '일부 쿠폰을 사용할 수 없습니다.'
          }),
          { 
            status: 400, 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    // 6. 추가 금액 계산 및 보유 시간 차감
    const servicePrice = reservationData.services.price_per_hour;
    const extensionHours = extensionMinutes / 60;
    const totalAdditionalCost = servicePrice * extensionHours;

    // 적립 시간 계산
    const accumulatedTime = reservationData.customers.accumulated_time_minutes || 0;
    let accumulatedTimeToUse = 0;
    if (useAccumulatedTime) {
      accumulatedTimeToUse = Math.min(accumulatedTime, extensionMinutes);
    }

    // 쿠폰 시간 계산
    let totalCouponTimeToUse = 0;
    const couponUsages: CouponUsage[] = [];
    let remainingExtensionMinutes = extensionMinutes - accumulatedTimeToUse;

    for (const coupon of customerCoupons) {
      if (remainingExtensionMinutes <= 0) break;
      
      const couponTimeToUse = Math.min(coupon.time_minutes, remainingExtensionMinutes);
      totalCouponTimeToUse += couponTimeToUse;
      remainingExtensionMinutes -= couponTimeToUse;
      
      couponUsages.push({
        couponId: coupon.id,
        minutes: couponTimeToUse
      });
    }

    const totalTimeUsed = accumulatedTimeToUse + totalCouponTimeToUse;
    const remainingMinutesToPay = extensionMinutes - totalTimeUsed;
    const finalAdditionalCost = (remainingMinutesToPay / 60) * servicePrice;

    // 7. 트랜잭션 시작 - DB 업데이트
    const originalEndTime = reservationData.end_time;
    const newTotalHours = reservationData.total_hours + extensionHours;
    const newTotalPrice = reservationData.total_price + finalAdditionalCost;

    try {
      // 예약 업데이트
      const { data: updatedReservation, error: updateReservationError } = await supabaseClient
        .from('reservations')
        .update({
          end_time: extendedEndTimeString,
          total_hours: newTotalHours,
          total_price: newTotalPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId)
        .select()
        .single();

      if (updateReservationError) {
        throw new Error(`예약 업데이트 실패: ${updateReservationError.message}`);
      }

      // 적립 시간 차감
      if (accumulatedTimeToUse > 0) {
        const newAccumulatedTime = accumulatedTime - accumulatedTimeToUse;
        const { error: updateCustomerError } = await supabaseClient
          .from('customers')
          .update({
            accumulated_time_minutes: newAccumulatedTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', reservationData.customer_id);

        if (updateCustomerError) {
          throw new Error(`적립 시간 차감 실패: ${updateCustomerError.message}`);
        }
      }

      // 쿠폰 사용 처리
      for (const couponUsage of couponUsages) {
        const coupon = customerCoupons.find(c => c.id === couponUsage.couponId);
        if (!coupon) continue;

        if (couponUsage.minutes >= coupon.time_minutes) {
          // 쿠폰 전체 사용
          const { error: updateCouponError } = await supabaseClient
            .from('customer_coupons')
            .update({
              is_used: true,
              used_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', couponUsage.couponId);

          if (updateCouponError) {
            throw new Error(`쿠폰 사용 처리 실패: ${updateCouponError.message}`);
          }
        } else {
          // 쿠폰 부분 사용
          const remainingTime = coupon.time_minutes - couponUsage.minutes;
          const { error: updateCouponError } = await supabaseClient
            .from('customer_coupons')
            .update({
              time_minutes: remainingTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', couponUsage.couponId);

          if (updateCouponError) {
            throw new Error(`쿠폰 부분 사용 처리 실패: ${updateCouponError.message}`);
          }
        }
      }

      // 8. 예약 이력 추가
      const { error: historyError } = await supabaseClient
        .from('reservation_history')
        .insert({
          reservation_id: reservationId,
          action_type: 'extended',
          action_description: `예약 ${extensionMinutes}분 연장 (${originalEndTime} → ${extendedEndTimeString})`,
          old_data: {
            end_time: originalEndTime,
            total_hours: reservationData.total_hours,
            total_price: reservationData.total_price
          },
          new_data: {
            end_time: extendedEndTimeString,
            total_hours: newTotalHours,
            total_price: newTotalPrice,
            timeUsed: {
              accumulated: accumulatedTimeToUse,
              coupons: couponUsages
            }
          },
          performed_by: reservationData.customer_id,
          performed_by_type: 'customer'
        });

      if (historyError) {
        console.error('예약 이력 추가 실패:', historyError);
      }

      // 9. 웹훅 이벤트 생성 및 저장
      const timestamp = new Date().toISOString();
      const webhookPayload: BookingExtendedWebhookPayload = {
        event: 'booking.extended',
        timestamp,
        data: {
          reservationId,
          customerId: reservationData.customer_id,
          originalEndTime: originalEndTime,
          newEndTime: extendedEndTimeString,
          extensionMinutes,
          additionalCost: Math.round(finalAdditionalCost),
          timeUsed: {
            accumulated: accumulatedTimeToUse,
            coupons: couponUsages
          }
        }
      };

      // 웹훅 이벤트를 데이터베이스에 저장
      try {
        const { data: webhookEventId, error: webhookEventError } = await supabaseClient.rpc('create_webhook_event', {
          p_event_type: 'booking.extended',
          p_event_data: webhookPayload,
          p_related_entity_type: 'reservation',
          p_related_entity_id: reservationId,
          p_created_by: reservationData.customer_id,
          p_max_retries: 3
        });

        if (webhookEventError) {
          console.error('웹훅 이벤트 생성 실패:', webhookEventError);
        } else {
          console.log('웹훅 이벤트 생성 성공:', webhookEventId);
          
          // 즉시 웹훅 발송 시도 (백그라운드에서)
          const webhookUrl = Deno.env.get('WEBHOOK_URL');
          if (webhookUrl && webhookEventId) {
            // 백그라운드로 웹훅 디스패처 호출 (fire-and-forget)
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-dispatcher`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({ event_id: webhookEventId })
            }).catch(error => {
              console.error('웹훅 디스패처 호출 실패:', error);
            });
          }
        }
      } catch (webhookError) {
        console.error('웹훅 이벤트 처리 중 오류:', webhookError);
        // 웹훅 실패가 전체 트랜잭션을 실패시키지 않도록 처리
      }

      // 10. 성공 응답 반환
      const response: ExtendReservationResponse = {
        success: true,
        message: `예약이 성공적으로 ${extensionMinutes}분 연장되었습니다.`,
        updatedReservation,
        timeUsed: {
          accumulated: accumulatedTimeToUse,
          coupons: couponUsages
        },
        additionalPaymentRequired: Math.round(finalAdditionalCost)
      };

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `트랜잭션 처리 중 오류가 발생했습니다: ${transactionError.message}`
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

  } catch (error) {
    console.error('Error in extend-reservation:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: '서버 오류가 발생했습니다.'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}); 