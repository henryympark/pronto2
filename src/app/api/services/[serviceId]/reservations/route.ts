import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase";
import { parse, isValid } from "date-fns";
import { timeToMinutes } from "@/lib/date-utils";

/**
 * 예약 생성 API
 * POST /api/services/:serviceId/reservations
 */
export async function POST(request: NextRequest) {
  let serviceId = 'unknown';
  
  try {
    // URL에서 serviceId 추출
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    serviceId = pathParts[pathParts.length - 2]; // /api/services/:serviceId/reservations에서 serviceId 추출
    
    if (!serviceId) {
      return NextResponse.json(
        { error: "서비스 ID가 필요합니다." },
        { status: 400 }
      );
    }

    console.log('[예약 API] 요청 시작 - serviceId:', serviceId);

    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    console.log('[예약 API] 인증 헤더 확인:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 20) + '...',
      hasAccessToken: !!accessToken
    });
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "인증 토큰이 필요합니다." },
        { status: 401 }
      );
    }

    // 인증된 사용자 컨텍스트로 Supabase 클라이언트 생성
    const supabase = createSupabaseServerClient();
    
    // 토큰으로 사용자 정보 가져오기
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !userData.user) {
      console.log('[예약 API] 인증 실패:', {
        hasUserError: !!userError,
        errorMessage: userError?.message,
        hasUser: !!userData.user
      });
      
      return NextResponse.json(
        { error: "유효하지 않은 인증 토큰입니다." },
        { status: 401 }
      );
    }

    const user = userData.user;
    
    console.log('[예약 API] 인증 성공:', {
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role
    });

    // RLS 컨텍스트를 위한 세션 설정 - 개선된 방식
    const authenticatedSupabase = createSupabaseServerClient();
    
    // 세션 설정으로 RLS 컨텍스트 활성화
    const { error: sessionError } = await authenticatedSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: 'temp_refresh_token' // 임시 토큰
    });

    if (sessionError) {
      console.log('[예약 API] 세션 설정 실패:', sessionError.message);
    } else {
      console.log('[예약 API] 세션 설정 성공');
    }

    // RLS 컨텍스트 확인
    const { data: authCheck, error: authCheckError } = await authenticatedSupabase
      .rpc('auth.uid');
    
    console.log('[예약 API] RLS 컨텍스트 확인:', { 
      authUid: authCheck, 
      error: authCheckError?.message 
    });

    // 요청 본문 파싱 - 할인 정보 추가
    const body = await request.json();
    const { 
      reservationDate, 
      startTime, 
      endTime, 
      totalHours, 
      totalPrice,
      // 할인 관련 필드 추가
      customerName,
      companyName,
      shootingPurpose,
      vehicleNumber,
      privacyAgreed,
      selectedAccumulatedMinutes = 0,
      selectedCouponIds = []
    } = body;

    // 필수 필드 검증
    if (!reservationDate || !startTime || !endTime || !totalHours || !totalPrice) {
      return NextResponse.json(
        { error: "예약에 필요한 모든 정보를 제공해주세요." },
        { status: 400 }
      );
    }

    // 개인정보 동의 확인
    if (!privacyAgreed) {
      return NextResponse.json(
        { error: "개인정보 수집 및 이용에 동의해주세요." },
        { status: 400 }
      );
    }

    // 날짜 형식 유효성 확인
    const parsedDate = parse(reservationDate, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) {
      return NextResponse.json(
        { error: "날짜 형식이 잘못되었습니다. 'YYYY-MM-DD' 형식으로 제공해주세요." },
        { status: 400 }
      );
    }

    // 예약 시간이 현재 시간보다 이후인지 확인
    const now = new Date();
    const [year, month, day] = reservationDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    
    const reservationDateTime = new Date(year, month - 1, day, hours, minutes);
    
    // 현재 시간에서 1분을 더한 시간보다 예약 시간이 이전이면 예약 불가
    const cutoffTime = new Date(now.getTime() + 60000); // 현재 시간 + 1분
    
    if (reservationDateTime < cutoffTime) {
      return NextResponse.json(
        { error: "이미 지나간 시간이나 현재 시간에 너무 가까운 시간은 예약할 수 없습니다." },
        { status: 400 }
      );
    }

    // 1. 서비스 존재 여부 확인 (서버 클라이언트 사용 - 공개 정보)
    const { data: service, error: serviceError } = await supabaseServer
      .from("services")
      .select("id, price_per_hour")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "해당 서비스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. 예약 시간 중복 확인 (pending 상태 포함) - 서버 클라이언트 사용
    const { data: existingReservations, error: reservationsError } = await supabaseServer
      .from("reservations")
      .select("id, start_time, end_time")
      .eq("service_id", serviceId)
      .eq("reservation_date", reservationDate)
      .in("status", ["pending", "confirmed", "modified"]);

    if (reservationsError) {
      return NextResponse.json(
        { error: "예약 정보를 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 시간 충돌 확인
    const requestStartTime = timeToMinutes(startTime);
    const requestEndTime = timeToMinutes(endTime);

    const hasTimeConflict = existingReservations?.some(reservation => {
      const existingStartTime = timeToMinutes(reservation.start_time);
      const existingEndTime = timeToMinutes(reservation.end_time);

      // 시간이 겹치는 경우
      return (
        (requestStartTime >= existingStartTime && requestStartTime < existingEndTime) ||
        (requestEndTime > existingStartTime && requestEndTime <= existingEndTime) ||
        (requestStartTime <= existingStartTime && requestEndTime >= existingEndTime)
      );
    });

    if (hasTimeConflict) {
      return NextResponse.json(
        { error: "이미 예약된 시간과 겹칩니다. 다른 시간을 선택해주세요." },
        { status: 409 }
      );
    }

    // 3. 차단된 시간과 충돌 확인 - 서버 클라이언트 사용
    const { data: blockedTimes, error: blockedTimesError } = await supabaseServer
      .from("blocked_times")
      .select("start_time, end_time")
      .eq("service_id", serviceId)
      .eq("blocked_date", reservationDate);

    if (blockedTimesError) {
      return NextResponse.json(
        { error: "차단된 시간 정보를 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const hasBlockedTimeConflict = blockedTimes?.some(blocked => {
      const blockedStartTime = timeToMinutes(blocked.start_time);
      const blockedEndTime = timeToMinutes(blocked.end_time);

      return (
        (requestStartTime >= blockedStartTime && requestStartTime < blockedEndTime) ||
        (requestEndTime > blockedStartTime && requestEndTime <= blockedEndTime) ||
        (requestStartTime <= blockedStartTime && requestEndTime >= blockedEndTime)
      );
    });

    if (hasBlockedTimeConflict) {
      return NextResponse.json(
        { error: "예약 불가능한 시간이 포함되어 있습니다." },
        { status: 409 }
      );
    }

    // 4. 할인 적용 전 검증 및 계산
    let finalPrice = totalPrice;
    let discountAmount = 0;
    let isUsingDiscount = false;
    
    if (selectedAccumulatedMinutes > 0 || selectedCouponIds.length > 0) {
      console.log('[예약 생성] 할인 적용 처리 시작');
      
      // 1시간 초과 예약만 할인 가능
      const totalMinutes = totalHours * 60;
      const excessMinutes = Math.max(0, totalMinutes - 60);
      
      if (excessMinutes <= 0) {
        return NextResponse.json(
          { error: "할인 혜택은 1시간 초과 예약 시에만 사용 가능합니다." },
          { status: 400 }
        );
      }

      // 사용자의 적립 시간 및 쿠폰 검증 - 서버 클라이언트 사용 (인증된 컨텍스트)
      if (selectedAccumulatedMinutes > 0) {
        const { data: customerData, error: customerError } = await supabaseServer
          .from('customers')
          .select('accumulated_time_minutes')
          .eq('id', user.id)
          .single();

        if (customerError || !customerData) {
          return NextResponse.json(
            { error: "고객 정보를 확인할 수 없습니다." },
            { status: 400 }
          );
        }

        if (customerData.accumulated_time_minutes < selectedAccumulatedMinutes) {
          return NextResponse.json(
            { error: "보유한 적립 시간이 부족합니다." },
            { status: 400 }
          );
        }
      }

      // 쿠폰 유효성 검증 - 서버 클라이언트 사용
      if (selectedCouponIds.length > 0) {
        const { data: couponsData, error: couponsError } = await supabaseServer
          .from('customer_coupons')
          .select('id, minutes, expires_at')
          .eq('customer_id', user.id)
          .eq('is_used', false)
          .in('id', selectedCouponIds);

        if (couponsError || !couponsData || couponsData.length !== selectedCouponIds.length) {
          return NextResponse.json(
            { error: "유효하지 않은 쿠폰이 포함되어 있습니다." },
            { status: 400 }
          );
        }

        // 만료일 확인
        const now = new Date();
        const expiredCoupon = couponsData.find(c => 
          c.expires_at && new Date(c.expires_at) < now
        );
        
        if (expiredCoupon) {
          return NextResponse.json(
            { error: "만료된 쿠폰이 포함되어 있습니다." },
            { status: 400 }
          );
        }
      }

      // 할인 금액 계산
      const hourlyRate = totalPrice / totalHours;
      const totalDiscountMinutes = Math.min(
        selectedAccumulatedMinutes + 
        (selectedCouponIds.length > 0 ? 
          (await supabaseServer
            .from('customer_coupons')
            .select('minutes')
            .in('id', selectedCouponIds)
          ).data?.reduce((sum: number, c: any) => sum + c.minutes, 0) || 0 : 0),
        excessMinutes
      );
      
      discountAmount = (totalDiscountMinutes / 60) * hourlyRate;
      finalPrice = totalPrice - discountAmount;
      isUsingDiscount = true;

      console.log('[예약 생성] 할인 계산 완료:', {
        totalDiscountMinutes,
        discountAmount,
        finalPrice
      });
    }

    // 5. 예약 생성 - authenticatedSupabase 사용 (RLS 컨텍스트 적용)
    try {
      console.log('[예약 생성] 트랜잭션 시작');

      // 예약 생성 - authenticatedSupabase 사용 (RLS 컨텍스트 적용)
      const { data: newReservation, error: createError } = await authenticatedSupabase
        .from("reservations")
        .insert({
          service_id: serviceId,
          customer_id: user.id,
          reservation_date: reservationDate,
          start_time: startTime,
          end_time: endTime,
          total_hours: totalHours,
          total_price: totalPrice,
          final_price: finalPrice,
          original_total_price: isUsingDiscount ? totalPrice : 0,
          used_accumulated_time_minutes: selectedAccumulatedMinutes,
          used_coupon_ids: selectedCouponIds,
          customer_name: customerName || user.email?.split('@')[0] || '',
          company_name: companyName || null,
          shooting_purpose: shootingPurpose || null,
          vehicle_number: vehicleNumber || null,
          privacy_agreed: privacyAgreed,
          status: "confirmed"
        })
        .select()
        .single();

      if (createError) {
        console.log('[예약 API] 예약 생성 실패:', {
          errorCode: createError.code,
          errorMessage: createError.message,
          errorDetails: createError.details,
          hint: createError.hint
        });

        // PostgreSQL UNIQUE 제약 조건 위반 (23505) - 동시성 에러
        if (createError.code === '23505') {
          // 동시 예약 실패 로그 기록 - 서버 클라이언트 사용 (로그는 공개적으로 기록)
          try {
            // 날짜와 시간을 조합하여 TIMESTAMP WITH TIME ZONE 생성
            const [year, month, day] = reservationDate.split('-').map(Number);
            const [hours, minutes] = startTime.split(':').map(Number);
            const startTimestamp = new Date(year, month - 1, day, hours, minutes);
            
            await supabaseServer
              .from("concurrent_booking_failures")
              .insert({
                service_id: serviceId,
                start_time: startTimestamp.toISOString(),
                attempted_customer_id: user.id,
                attempted_at: new Date().toISOString(),
                error_message: createError.message,
                payment_id: null
              });
          } catch (logError) {
            console.error("동시 예약 실패 로그 기록 실패:", logError);
          }

          return NextResponse.json(
            { 
              error: "CONCURRENT_BOOKING",
              message: "죄송합니다. 같은 시간에 다른 고객이 먼저 예약을 완료했습니다. 다른 시간을 선택해주세요." 
            },
            { status: 409 }
          );
        }

        // PostgreSQL 커스텀 에러 (P0001) - 비즈니스 로직 제약 위반
        if (createError.code === 'P0001') {
          return NextResponse.json(
            { 
              error: "BOOKING_CONFLICT",
              message: createError.message || "선택하신 시간에 이미 다른 예약이 있습니다. 다른 시간을 선택해주세요." 
            },
            { status: 409 }
          );
        }

        // 기타 DB 제약 조건 위반
        if (createError.code && createError.code.startsWith('23')) {
          return NextResponse.json(
            { 
              error: "CONSTRAINT_VIOLATION",
              message: "예약 생성 중 데이터 제약 조건에 위반되었습니다. 입력 정보를 확인해주세요." 
            },
            { status: 400 }
          );
        }

        console.error("예약 생성 에러:", createError);
        return NextResponse.json(
          { error: "예약 생성 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }

      console.log('[예약 생성] 예약 생성 성공:', newReservation.id);

      // 6. 할인 적용 처리 (트랜잭션 내) - 서버 클라이언트 사용
      if (isUsingDiscount) {
        console.log('[예약 생성] 할인 적용 처리 시작');

        try {
          // 적립 시간 차감
          if (selectedAccumulatedMinutes > 0) {
            const { data: currentCustomer, error: fetchError } = await supabaseServer
              .from('customers')
              .select('accumulated_time_minutes')
              .eq('id', user.id)
              .single();

            if (fetchError || !currentCustomer) {
              throw new Error('고객 정보 조회 실패');
            }

            const newAccumulatedMinutes = currentCustomer.accumulated_time_minutes - selectedAccumulatedMinutes;
            
            if (newAccumulatedMinutes < 0) {
              throw new Error('적립 시간이 부족합니다');
            }

            const { error: updateError } = await supabaseServer
              .from('customers')
              .update({
                accumulated_time_minutes: newAccumulatedMinutes,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);

            if (updateError) {
              throw new Error(`적립 시간 차감 실패: ${updateError.message}`);
            }

            console.log('[예약 생성] 적립 시간 차감 완료:', selectedAccumulatedMinutes);
          }

          // 쿠폰 사용 처리
          if (selectedCouponIds.length > 0) {
            const { error: couponError } = await supabaseServer
              .from('customer_coupons')
              .update({
                is_used: true,
                used_at: new Date().toISOString(),
                used_reservation_id: newReservation.id,
                updated_at: new Date().toISOString()
              })
              .in('id', selectedCouponIds)
              .eq('customer_id', user.id)
              .eq('is_used', false);

            if (couponError) {
              throw new Error(`쿠폰 사용 처리 실패: ${couponError.message}`);
            }

            console.log('[예약 생성] 쿠폰 사용 처리 완료:', selectedCouponIds.length);
          }

        } catch (discountError) {
          console.error('[예약 생성] 할인 처리 실패:', discountError);
          
          // 할인 처리 실패 시 예약 삭제 (롤백)
          await supabaseServer.from('reservations').delete().eq('id', newReservation.id);
          
          return NextResponse.json(
            { error: discountError instanceof Error ? discountError.message : "할인 처리 중 오류가 발생했습니다." },
            { status: 500 }
          );
        }
      }

      console.log('[예약 생성] 트랜잭션 완료');

      return NextResponse.json({
        message: "예약이 성공적으로 생성되었습니다.",
        reservation: {
          ...newReservation,
          discount_applied: isUsingDiscount,
          discount_amount: discountAmount,
          final_price: finalPrice
        }
      }, { status: 201 });

    } catch (dbError: any) {
      console.error("DB 예약 생성 중 예외:", dbError);
      
      // PostgreSQL UNIQUE 제약 조건 위반
      if (dbError?.code === '23505' || dbError?.message?.includes('unique_constraint')) {
        return NextResponse.json(
          { 
            error: "CONCURRENT_BOOKING",
            message: "죄송합니다. 같은 시간에 다른 고객이 먼저 예약을 완료했습니다. 다른 시간을 선택해주세요." 
          },
          { status: 409 }
        );
      }

      // 기타 DB 에러
      return NextResponse.json(
        { error: "예약 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[예약 API] 예기치 못한 에러:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      serviceId: serviceId
    });
    
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 특정 서비스의 예약 목록 조회 API
 * GET /api/services/:serviceId/reservations?date=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    // URL에서 serviceId 추출
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const serviceId = pathParts[pathParts.length - 2]; // /api/services/:serviceId/reservations에서 serviceId 추출
    
    if (!serviceId) {
      return NextResponse.json(
        { error: "서비스 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // URL 파라미터에서 날짜 정보 추출
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // 날짜 필터가 있는 경우
    let query = supabaseServer
      .from("reservations")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false });

    if (dateParam) {
      // 날짜 형식 유효성 확인
      const parsedDate = parse(dateParam, "yyyy-MM-dd", new Date());
      if (!isValid(parsedDate)) {
        return NextResponse.json(
          { error: "날짜 형식이 잘못되었습니다. 'YYYY-MM-DD' 형식으로 제공해주세요." },
          { status: 400 }
        );
      }

      query = query.eq("reservation_date", dateParam);
    }

    const { data: reservations, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "예약 정보를 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservations });
    
  } catch (error) {
    console.error("예약 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 