/**
 * Booking 도메인 스토어 통합 export
 * 예약 관련 모든 상태 관리 스토어들을 통합 제공
 */

// 예약 폼 스토어
export { useBookingFormStore, type CustomerFormData } from './bookingFormStore';

// 예약 상태 스토어
export { useReservationStore, type TimeRange } from './reservationStore';

// 기존 코드와의 호환성을 위한 alias export
export {
  useBookingFormStore as useBookingStore
} from './bookingFormStore';

export {
  useReservationStore as useBookingReservationStore
} from './reservationStore';
