/**
 * Booking 도메인 타입 통합 export
 * 예약 관련 모든 타입들을 여기서 관리
 */

// 핵심 예약 타입
export * from './booking';

// 폼 관련 타입
export * from './forms';

// 캘린더 관련 타입
export * from './calendar';

// API 관련 타입
export * from './api';

// 기존 reservation 타입과의 호환성을 위한 alias
export type {
  Booking as Reservation,
  BookingStatus as ReservationStatus,
  CreateBookingRequest as CreateReservationRequest,
  BookingDetail as ReservationDetailResponse
} from './booking';
