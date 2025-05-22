import { SupabaseClient } from "@supabase/supabase-js";
import { format, parseISO, startOfDay, endOfDay, isEqual } from "date-fns";
import { Reservation } from "@/types/reservation";

// 특정 날짜의 기존 예약 조회
export const getReservationsByDate = async (
  supabase: SupabaseClient,
  serviceId: string,
  date: Date
): Promise<Reservation[]> => {
  const startTime = startOfDay(date).toISOString();
  const endTime = endOfDay(date).toISOString();
  
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("service_id", serviceId)
    .gte("start_time", startTime)
    .lte("start_time", endTime)
    .neq("status", "canceled");
  
  if (error) {
    console.error("예약 조회 오류:", error);
    throw new Error(`예약 조회 중 오류가 발생했습니다: ${error.message}`);
  }
  
  return data as Reservation[];
};

// 예약 가능 여부 확인 (이미 예약된 시간 슬롯 확인)
export const isTimeSlotReserved = (
  reservations: Reservation[],
  timeSlot: string,
  date: Date
): boolean => {
  const dateStr = format(date, "yyyy-MM-dd");
  const timeSlotDateTime = parseISO(`${dateStr}T${timeSlot}:00`);
  
  // 예약 상태가 취소가 아닌 예약 중에서 시간이 겹치는지 확인
  return reservations.some(reservation => {
    const reservationStart = parseISO(reservation.start_time);
    const reservationEnd = parseISO(reservation.end_time);
    
    // 시작 시간이 다른 예약의 시작/종료 시간 사이에 있거나,
    // 종료 시간이 다른 예약의 시작/종료 시간 사이에 있으면 겹침
    return reservation.status !== 'canceled' && (
      (timeSlotDateTime >= reservationStart && timeSlotDateTime < reservationEnd) ||
      // 정확히 예약 시작 시간과 같은 경우도 예약됨으로 처리
      isEqual(timeSlotDateTime, reservationStart)
    );
  });
}; 