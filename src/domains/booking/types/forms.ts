/**
 * Booking 폼 관련 타입 정의
 * 예약 생성, 수정 시 사용되는 폼 타입들
 */

import { BookingStatus } from './booking';

/**
 * 예약 폼 데이터 타입
 */
export interface BookingFormData {
  serviceId: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  totalPrice: number;
  notes?: string;
  participants?: number;
}

/**
 * 예약 폼 에러 타입
 */
export interface BookingFormErrors {
  serviceId?: string;
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  totalHours?: string;
  totalPrice?: string;
  notes?: string;
  participants?: string;
  general?: string;
}

/**
 * 예약 폼 상태 타입
 */
export interface BookingFormState {
  data: BookingFormData;
  errors: BookingFormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * 예약 수정 폼 데이터 타입
 */
export interface BookingEditFormData extends Partial<BookingFormData> {
  id: string;
  status?: BookingStatus;
}

/**
 * 시간 슬롯 선택 폼 데이터
 */
export interface TimeSlotFormData {
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // 시간 단위
}

/**
 * 예약 취소 폼 데이터
 */
export interface BookingCancelFormData {
  reason: string;
  refundAmount?: number;
  notes?: string;
}

/**
 * 예약 검색 폼 데이터
 */
export interface BookingSearchFormData {
  keyword?: string;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  studioName?: string;
}
