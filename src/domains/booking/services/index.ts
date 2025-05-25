/**
 * Booking 도메인 서비스 통합 export
 * API, 유틸리티, 유효성 검사 등 모든 서비스를 통합 제공
 */

// API 서비스
export * from './bookingApi';

// 유틸리티 함수들
export * from './bookingUtils';

// 유효성 검사
export * from './bookingValidation';

// 기존 코드와의 호환성을 위한 re-export
export {
  getReservationsByDate,
  isTimeSlotReserved,
  createBookingApiService
} from './bookingApi';

export {
  getBookingStatusLabel as getReservationStatusLabel,
  formatBookingTime as formatReservationTime,
  formatBookingDate as formatReservationDate,
  calculateBookingDuration as calculateReservationDuration,
  isBookingAvailable as isReservationAvailable
} from './bookingUtils';

export {
  validateBookingForm as validateReservationForm,
  validateCreateBookingRequest as validateCreateReservationRequest
} from './bookingValidation';
