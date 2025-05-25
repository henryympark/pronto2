/**
 * Booking 캘린더 관련 타입 정의
 * 달력 UI, 시간 선택 등에 사용되는 타입들
 */

import { Booking } from './booking';

/**
 * 시간 슬롯 타입
 */
export interface TimeSlot {
  time: string; // HH:MM 형식
  available: boolean;
  price?: number;
  booking?: Booking; // 이미 예약된 경우
}

/**
 * 날짜별 시간 슬롯 정보
 */
export interface DateTimeSlots {
  date: string; // YYYY-MM-DD 형식
  timeSlots: TimeSlot[];
  operatingHours: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  isHoliday?: boolean;
  specialPrice?: number;
}

/**
 * 캘린더 이벤트 (예약 표시용)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  booking: Booking;
  color?: string;
  textColor?: string;
}

/**
 * 월별 캘린더 데이터
 */
export interface MonthlyCalendarData {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
}

/**
 * 캘린더 일자별 데이터
 */
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0(일요일) - 6(토요일)
  bookings: Booking[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isHoliday: boolean;
  totalBookings: number;
  totalRevenue: number;
}

/**
 * 예약 가능 시간 조회 응답
 */
export interface AvailableTimesResponse {
  operatingStartTime: string;
  operatingEndTime: string;
  unavailableSlots: string[];
  message?: string;
}

/**
 * 시간 범위 선택 데이터
 */
export interface TimeRangeSelection {
  startTime: string;
  endTime: string;
  duration: number; // 분 단위
  isValid: boolean;
  price: number;
}

/**
 * 캘린더 뷰 타입
 */
export type CalendarViewType = 'month' | 'week' | 'day' | 'list';

/**
 * 캘린더 설정
 */
export interface CalendarSettings {
  viewType: CalendarViewType;
  showWeekends: boolean;
  startTime: string; // 표시 시작 시간
  endTime: string;   // 표시 종료 시간
  timeSlotDuration: number; // 시간 슬롯 간격 (분)
}
