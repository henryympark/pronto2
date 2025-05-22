import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { parse, isValid } from "date-fns";
import { timeToMinutes } from "@/lib/date-utils";

/**
 * 예약 생성 API
 * POST /api/services/:serviceId/reservations
 */
export async function POST(request: NextRequest) {
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

    // 요청 본문 파싱
    const body = await request.json();
    const { 
      customerId, 
      reservationDate, 
      startTime, 
      endTime, 
      totalHours, 
      totalPrice 
    } = body;

    // 필수 필드 검증
    if (!reservationDate || !startTime || !endTime || !totalHours || !totalPrice) {
      return NextResponse.json(
        { error: "예약에 필요한 모든 정보를 제공해주세요." },
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

    // 1. 서비스 존재 여부 확인
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

    // 2. 예약 시간 중복 확인
    const { data: existingReservations, error: reservationsError } = await supabaseServer
      .from("reservations")
      .select("id, start_time, end_time")
      .eq("service_id", serviceId)
      .eq("reservation_date", reservationDate)
      .in("status", ["pending", "confirmed"]);

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

    // 3. 차단된 시간과 충돌 확인
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

    // 4. 새 예약 생성
    const { data: newReservation, error: createError } = await supabaseServer
      .from("reservations")
      .insert({
        service_id: serviceId,
        customer_id: customerId || null,
        reservation_date: reservationDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: totalHours,
        total_price: totalPrice,
        status: "pending"
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: "예약 생성 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "예약이 성공적으로 생성되었습니다.",
      reservation: newReservation
    }, { status: 201 });
    
  } catch (error) {
    console.error("예약 생성 중 오류 발생:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
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