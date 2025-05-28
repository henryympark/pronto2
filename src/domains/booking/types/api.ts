/**
 * Booking API 관련 타입 정의
 * API 요청/응답 타입들
 */

import { Booking, BookingDetail, BookingSearchParams, BookingStats } from './booking';

/**
 * API 공통 응답 타입
 */
export interface ApiResponse<T = any> {
  data?: T;
  message: string;
  success: boolean;
  error?: string;
}

/**
 * 예약 생성 응답
 */
export interface CreateBookingResponse extends ApiResponse<Booking> {
  reservation: Booking;
}

/**
 * 예약 목록 응답
 */
export interface BookingListResponse extends ApiResponse<Booking[]> {
  reservations: Booking[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 예약 상세 응답
 */
export interface BookingDetailResponse extends ApiResponse<BookingDetail> {
  reservation: BookingDetail;
}

/**
 * 예약 상태 업데이트 응답
 */
export interface UpdateBookingStatusResponse extends ApiResponse<Booking> {
  reservation: Booking;
}

/**
 * 예약 삭제 응답
 */
export interface DeleteBookingResponse extends ApiResponse {
  // message만 포함
}

/**
 * 예약 통계 응답
 */
export interface BookingStatsResponse extends ApiResponse<BookingStats> {
  stats: BookingStats;
}

/**
 * 예약 검증 응답
 */
export interface BookingValidationResponse extends ApiResponse {
  isValid: boolean;
  conflicts?: Booking[];
  reasons?: string[];
}

/**
 * 예약 가격 계산 응답
 */
export interface BookingPriceResponse extends ApiResponse {
  totalPrice: number;
  basePrice: number;
  discountAmount?: number;
  additionalFees?: {
    name: string;
    amount: number;
  }[];
  breakdown: {
    hourlyRate: number;
    hours: number;
    subtotal: number;
  };
}

/**
 * 벌크 예약 작업 응답
 */
export interface BulkBookingResponse extends ApiResponse {
  successful: Booking[];
  failed: {
    request: any;
    error: string;
  }[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}
