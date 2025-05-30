/**
 * Booking Utilities
 * 예약 관련 유틸리티 함수들
 */

import { format, parseISO, differenceInMinutes } from "date-fns";
import { ko } from "date-fns/locale";
import { TimeSlot } from "../types/calendar";
import { Booking } from "../types/booking";

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
      
      const available = isBookingAvailable(timeString, existingBookings, date);
      
      slots.push({
        time: timeString,
        available
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

// 예약 시간 유효성 검사 (bookingValidation.ts에서 import하는 함수)
export const validateBookingTime = (
  startTime: string,
  endTime: string,
  date: string,
  existingBookings: Booking[] = []
): { isValid: boolean; error?: string } => {
  // 시간 형식 검사
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return { isValid: false, error: '올바른 시간 형식이 아닙니다 (HH:MM).' };
  }
  
  // 시작 시간이 종료 시간보다 빠른지 확인
  const start = parseISO(`2000-01-01T${startTime}`);
  const end = parseISO(`2000-01-01T${endTime}`);
  
  if (start >= end) {
    return { isValid: false, error: '시작 시간은 종료 시간보다 빨라야 합니다.' };
  }
  
  // 최소 예약 시간 확인 (30분)
  const duration = calculateBookingDuration(startTime, endTime);
  if (duration < 0.5) {
    return { isValid: false, error: '최소 예약 시간은 30분입니다.' };
  }
  
  // 최대 예약 시간 확인 (12시간)
  if (duration > 12) {
    return { isValid: false, error: '최대 예약 시간은 12시간입니다.' };
  }
  
  // 과거 시간 예약 방지
  const now = new Date();
  const bookingDateTime = parseISO(`${date}T${startTime}`);
  
  if (bookingDateTime <= now) {
    return { isValid: false, error: '과거 시간은 예약할 수 없습니다.' };
  }
  
  // 기존 예약과의 충돌 확인
  const hasConflict = existingBookings.some(booking => {
    if (booking.status === 'canceled') return false;
    
    const existingStart = parseISO(`${booking.reservation_date}T${booking.start_time}`);
    const existingEnd = parseISO(`${booking.reservation_date}T${booking.end_time}`);
    const newStart = parseISO(`${date}T${startTime}`);
    const newEnd = parseISO(`${date}T${endTime}`);
    
    // 시간 범위 겹침 확인
    return (newStart < existingEnd && newEnd > existingStart);
  });
  
  if (hasConflict) {
    return { isValid: false, error: '해당 시간대에 이미 예약이 있습니다.' };
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
