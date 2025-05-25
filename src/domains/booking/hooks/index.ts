/**
 * Booking 도메인 훅 통합 export
 * 예약 관련 모든 커스텀 훅들을 통합 제공
 */

// 개별 예약 관리
export { useBooking } from './useBooking';

// 예약 목록 관리
export { useBookings } from './useBookings';

// 예약 폼 관리
export { useBookingForm } from './useBookingForm';

// 시간 슬롯 관리
export { useTimeSlots } from './useTimeSlots';

// 예약 가능성 관리
export { useAvailability } from './useAvailability';

// 기존 코드와의 호환성을 위한 alias export
export {
  useBooking as useReservation,
  useBookings as useReservations,
  useBookingForm as useReservationForm
} from './useBooking';
