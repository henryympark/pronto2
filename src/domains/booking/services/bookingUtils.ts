/**
 * Booking Utilities
 * 예약 관련 유틸리티 함수들
 */

import { format, parseISO, differenceInMinutes } from "date-fns";
import { ko } from "date-fns/locale";

// 타입 정의
export interface TimeSlot {
  time: string;
  status: 'available' | 'unavailable' | 'selected' | 'disabled';
}

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

// 예약 상태 라벨 반환
export const getBookingStatusLabel = (status: string): string => {
  const statusLabels: { [key: string]: string } = {
    'pending': '대기중',
    'confirmed': '확정',
    'modified': '변경됨',
    'canceled': '취소됨',
    'completed': '완료',
    'no-show': '미출석'
  };
  
  return statusLabels[status] || status;
};

// 예약 시간 포맷팅
export const formatBookingTime = (timeString: string): string => {
  try {
    const time = timeString.substring(0, 5); // HH:MM 형식으로 자르기
    return time;
  } catch (error) {
    return timeString;
  }
};

// 예약 날짜 포맷팅
export const formatBookingDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, 'yyyy년 MM월 dd일 (eee)', { locale: ko });
  } catch (error) {
    return dateString;
  }
};

// 예약 시간 계산 (시간 단위)
export const calculateBookingDuration = (startTime: string, endTime: string): number => {
  try {
    const start = parseISO(`2000-01-01T${startTime}`);
    const end = parseISO(`2000-01-01T${endTime}`);
    return differenceInMinutes(end, start) / 60;
  } catch (error) {
    return 0;
  }
};

// 예약 가능 여부 확인
export const isBookingAvailable = (
  timeSlot: string,
  existingBookings: Booking[],
  date: string
): boolean => {
  const dateStr = format(new Date(date), 'yyyy-MM-dd');
  const slotDateTime = parseISO(`${dateStr}T${timeSlot}:00`);
  
  return !existingBookings.some(booking => {
    const bookingStart = parseISO(`${booking.reservation_date}T${booking.start_time}`);
    const bookingEnd = parseISO(`${booking.reservation_date}T${booking.end_time}`);
    
    return booking.status !== 'canceled' && 
           slotDateTime >= bookingStart && 
           slotDateTime < bookingEnd;
  });
};

// 시간 슬롯 생성
export const generateTimeSlots = (
  startHour: number,
  endHour: number,
  intervalMinutes: number,
  existingBookings: Booking[],
  date: string
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      const status = isBookingAvailable(timeString, existingBookings, date) 
        ? 'available' 
        : 'unavailable';
      
      slots.push({
        time: timeString,
        status
      });
    }
  }
  
  return slots;
};

// 예약 유효성 검사
export const validateBookingData = (
  serviceId: string,
  date: string,
  startTime: string,
  endTime: string
): { isValid: boolean; error?: string } => {
  if (!serviceId) {
    return { isValid: false, error: '서비스를 선택해주세요.' };
  }
  
  if (!date) {
    return { isValid: false, error: '날짜를 선택해주세요.' };
  }
  
  if (!startTime || !endTime) {
    return { isValid: false, error: '시간을 선택해주세요.' };
  }
  
  const duration = calculateBookingDuration(startTime, endTime);
  if (duration <= 0) {
    return { isValid: false, error: '올바른 시간을 선택해주세요.' };
  }
  
  return { isValid: true };
};

// 가격 계산
export const calculateBookingPrice = (
  startTime: string,
  endTime: string,
  pricePerHour: number
): number => {
  const duration = calculateBookingDuration(startTime, endTime);
  return Math.round(duration * pricePerHour);
};
