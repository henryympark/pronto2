import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { format, parse, isValid, isSameDay, startOfDay, differenceInDays, addMinutes } from "date-fns";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from "@/constants/region";
import { OPERATION_START_TIME, OPERATION_END_TIME, TIME_SLOT_INTERVAL } from "@/constants/time";
import { CACHE_DURATIONS } from "@/constants/cache";
import { API_PATHS } from "@/constants/apiPaths";
import { timeToMinutes, formatMinutesToTime } from "@/lib/date-utils";

/**
 * 특정 서비스의 예약 가능 시간 조회 API
 * GET /api/services/:serviceId/available-times?date=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    // URL에서 serviceId 추출
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const serviceId = pathParts[pathParts.length - 2]; // /api/services/:serviceId/available-times에서 serviceId 추출

    // URL 파라미터에서 날짜 정보 추출
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // serviceId와 date 파라미터 유효성 검사
    if (!serviceId) {
      return NextResponse.json(
        { error: "서비스 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!dateParam) {
      return NextResponse.json(
        { error: "날짜 정보가 필요합니다. 'date' 쿼리 파라미터를 제공해주세요." },
        { status: 400 }
      );
    }

    // 날짜 형식 유효성 확인 (YYYY-MM-DD)
    const parsedDate = parse(dateParam, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) {
      return NextResponse.json(
        { error: "날짜 형식이 잘못되었습니다. 'YYYY-MM-DD' 형식으로 제공해주세요." },
        { status: 400 }
      );
    }

    // 1. 현재 시간을 KST 기준으로 가져오기
    const nowUtc = new Date(); // 현재 UTC 시간
    const nowKST = toZonedTime(nowUtc, DEFAULT_TIMEZONE);
    
    // 2. 요청된 날짜 문자열(YYYY-MM-DD)을 KST 자정 Date 객체로 파싱
    const [year, month, day] = dateParam.split('-').map(Number);
    // 선택된 날짜를 KST 시간대로 처리 (자정 기준)
    const selectedDateKST = new Date(year, month - 1, day);
    const selectedDateKSTZoned = toZonedTime(selectedDateKST, DEFAULT_TIMEZONE);
    
    // KST 기준 오늘 자정 계산
    const todayKSTStartOfDay = startOfDay(nowKST);
    const selectedDateKSTStartOfDay = startOfDay(selectedDateKSTZoned);
    
    // 날짜 차이 계산
    const daysDiff = differenceInDays(selectedDateKSTStartOfDay, todayKSTStartOfDay);
    const isToday = daysDiff === 0;
    const isTomorrow = daysDiff === 1;
    
    // 요일 정보 추출 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const dayOfWeek = selectedDateKSTZoned.getDay();

    // 서비스 존재 여부 확인
    const { data: service, error: serviceError } = await supabaseServer
      .from("services")
      .select("id, name, price_per_hour")
      .eq("id", serviceId)
      .single();

    // 서비스 체크
    if (serviceError || !service) {
      return NextResponse.json(
        { error: "해당 서비스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // holidays 테이블에서 해당 날짜가 휴무일인지 확인
    const { data: holiday, error: holidayError } = await supabaseServer
      .from("holidays")
      .select("id, description")
      .eq("service_id", serviceId)
      .eq("holiday_date", dateParam)
      .single();

    if (!holidayError && holiday) {
      // 휴무일인 경우 전체 예약 불가 처리
      const response = NextResponse.json({
        date: dateParam,
        operatingStartTime: null,
        operatingEndTime: null,
        unavailableSlots: generateAllTimeSlots(),
        currentTime: isToday ? formatCurrentTime(nowKST) : null,
        isClosed: true,
        message: holiday.description || "휴무일입니다."
      });
      const maxAge = CACHE_DURATIONS.AVAILABLE_TIMES.FUTURE;
      response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
      return response;
    }

    // 병렬로 다양한 쿼리들을 실행
    const [operatingHoursResponse, reservationsResponse, blockedTimesResponse] = await Promise.all([
      // 1. 서비스 운영 시간 조회
      supabaseServer
        .from("service_operating_hours")
        .select("start_time, end_time, is_closed")
        .eq("service_id", serviceId)
        .eq("day_of_week", dayOfWeek)
        .single(),
      
      // 2. 해당 날짜의 예약 정보 조회
      supabaseServer
        .from("reservations")
        .select("start_time, end_time")
        .eq("service_id", serviceId)
        .eq("reservation_date", dateParam)
        .in("status", ["pending", "confirmed"]),
      
      // 3. 해당 날짜의 차단된 시간 조회
      supabaseServer
        .from("blocked_times")
        .select("start_time, end_time")
        .eq("service_id", serviceId)
        .eq("blocked_date", dateParam)
    ]);

    // 기본 운영 시간 설정
    let operatingHours = {
      start_time: OPERATION_START_TIME,  // 기본값: 상수 파일에서 가져옴
      end_time: OPERATION_END_TIME,      // 기본값: 상수 파일에서 가져옴
      is_closed: false                   // 기본값: 휴무 아님
    };
    
    // 운영 시간 설정 (오류가 없고 데이터가 있는 경우만)
    if (!operatingHoursResponse.error && operatingHoursResponse.data) {
      operatingHours = operatingHoursResponse.data;
    }

    // 해당 요일에 휴무일인 경우
    if (operatingHours.is_closed) {
      const response = NextResponse.json({
        date: dateParam,
        operatingStartTime: operatingHours.start_time,
        operatingEndTime: operatingHours.end_time,
        unavailableSlots: generateAllTimeSlots(),
        currentTime: isToday ? formatCurrentTime(nowKST) : null,
        isClosed: true,
        message: "해당 요일은 휴무일입니다."
      });
      
      // 캐싱 헤더 추가 (상수 파일에서 가져온 값 사용)
      const maxAge = CACHE_DURATIONS.AVAILABLE_TIMES.FUTURE;
      response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
      return response;
    }

    // 예약 정보 처리
    const reservations = reservationsResponse.error ? [] : reservationsResponse.data || [];
    
    // 차단된 시간 처리
    const blockedTimes = blockedTimesResponse.error ? [] : blockedTimesResponse.data || [];

    // 5. 운영 시간 내 예약 불가능한 시간대 계산 (TIME_SLOT_INTERVAL 단위 시간 슬롯)
    const unavailableSlots: string[] = [];

    // 운영 시간을 분 단위로 변환
    const operatingStartTime = timeToMinutes(operatingHours.start_time);
    const operatingEndTime = timeToMinutes(operatingHours.end_time);
    
    // KST 기준 현재 시간을 분으로 변환
    const currentMinutes = nowKST.getHours() * 60 + nowKST.getMinutes();
    
    // 모든 TIME_SLOT_INTERVAL 단위 슬롯 생성 (00:00 ~ 23:30)
    for (let minutes = 0; minutes < 24 * 60; minutes += TIME_SLOT_INTERVAL) {
      const slotTime = formatMinutesToTime(minutes);

      // 1. 운영 시간 외 시간 슬롯은 불가능 처리
      if (minutes < operatingStartTime || minutes >= operatingEndTime) {
        unavailableSlots.push(slotTime);
        continue;
      }
      
      // 2. 오늘 날짜인 경우 현재 시간 이전 슬롯은 예약 불가능
      if (isToday && minutes <= currentMinutes) {
        unavailableSlots.push(slotTime);
        continue;
      }
      
      // 3. 이미 예약된 시간 슬롯 처리
      const isSlotReserved = reservations?.some(reservation => {
        const reservationStart = timeToMinutes(reservation.start_time);
        const reservationEnd = timeToMinutes(reservation.end_time);
        return minutes >= reservationStart && minutes < reservationEnd;
      });

      // 4. 차단된 시간 슬롯 처리
      const isSlotBlocked = blockedTimes?.some(blocked => {
        const blockedStart = timeToMinutes(blocked.start_time);
        const blockedEnd = timeToMinutes(blocked.end_time);
        return minutes >= blockedStart && minutes < blockedEnd;
      });

      if (isSlotReserved || isSlotBlocked) {
        unavailableSlots.push(slotTime);
      }
    }

    // 응답 데이터 구성
    const responseData = {
      date: dateParam,
      operatingStartTime: operatingHours.start_time,
      operatingEndTime: operatingHours.end_time,
      unavailableSlots,
      currentTime: isToday ? formatCurrentTime(nowKST) : null,
      isClosed: false,
      message: null,
      isToday: isToday,
      daysDiff: daysDiff
    };

    // 응답 생성 및 캐싱 헤더 설정
    const response = NextResponse.json(responseData);
    
    // 오늘 날짜인 경우 5분, 나머지는 15분 캐싱 (상수 파일에서 가져온 값 사용)
    const maxAge = isToday ? CACHE_DURATIONS.AVAILABLE_TIMES.TODAY : CACHE_DURATIONS.AVAILABLE_TIMES.FUTURE;
    response.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
    
    return response;
    
  } catch (error) {
    console.error("예약 가능 시간 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 현재 시간을 HH:MM 형식으로 변환
 */
function formatCurrentTime(date: Date): string {
  return formatInTimeZone(date, DEFAULT_TIMEZONE, 'HH:mm');
}

/**
 * 모든 시간 슬롯 생성 (TIME_SLOT_INTERVAL 단위)
 */
function generateAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += TIME_SLOT_INTERVAL) {
      slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
    }
  }
  return slots;
} 