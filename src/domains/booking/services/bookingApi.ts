/**
 * Booking API Service
 * 예약 관련 API 함수들
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { format, parseISO, startOfDay, endOfDay, isEqual } from "date-fns";

// 타입 정의
export interface Booking {
  id: string;
  service_id: string;
  customer_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableTimesApiResponse {
  success: boolean;
  currentTime: string;
  operatingStartTime: string;
  operatingEndTime: string;
  isClosed: boolean;
  isToday: boolean;
  daysDiff: number;
  unavailableSlots: string[];
  message?: string;
  error?: string;
}

// 특정 날짜의 기존 예약 조회
export const getReservationsByDate = async (
  supabase: SupabaseClient,
  serviceId: string,
  date: Date
): Promise<Booking[]> => {
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
  
  return data as Booking[];
};

// 예약 가능 여부 확인 (이미 예약된 시간 슬롯 확인)
export const isTimeSlotReserved = (
  reservations: Booking[],
  timeSlot: string,
  date: Date
): boolean => {
  const dateStr = format(date, "yyyy-MM-dd");
  const timeSlotDateTime = parseISO(`${dateStr}T${timeSlot}:00`);
  
  return reservations.some(reservation => {
    const reservationStart = parseISO(reservation.start_time);
    const reservationEnd = parseISO(reservation.end_time);
    
    return reservation.status !== 'canceled' && (
      (timeSlotDateTime >= reservationStart && timeSlotDateTime < reservationEnd) ||
      isEqual(timeSlotDateTime, reservationStart)
    );
  });
};

// 날짜별 예약 조회
export const getBookingsByDate = async (
  supabase: SupabaseClient,
  serviceId: string,
  date: Date
): Promise<Booking[]> => {
  return getReservationsByDate(supabase, serviceId, date);
};

// 예약 가능 시간 조회 API 서비스
export const createBookingApiService = (supabase: SupabaseClient) => {
  return {
    getAvailableTimes: async (serviceId: string, date: string): Promise<AvailableTimesApiResponse> => {
      try {
        const response = await fetch(`/api/services/${serviceId}/available-times?date=${date}`);
        
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          ...data
        };
      } catch (error) {
        return {
          success: false,
          currentTime: "",
          operatingStartTime: "09:00",
          operatingEndTime: "22:00",
          isClosed: false,
          isToday: false,
          daysDiff: 0,
          unavailableSlots: [],
          error: error instanceof Error ? error.message : "알 수 없는 오류"
        };
      }
    },
    
    getBookingsByDate: async (serviceId: string, date: Date): Promise<Booking[]> => {
      return getBookingsByDate(supabase, serviceId, date);
    }
  };
};
