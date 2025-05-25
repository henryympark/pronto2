/**
 * Booking 도메인 메인 export
 * 예약 도메인의 모든 기능들을 통합 제공
 */

// === 컴포넌트 ===
export * from './components';

// === 훅 ===
export * from './hooks';

// === 서비스 ===
export * from './services';

// === 타입 ===
export * from './types';

// === 스토어 ===
export * from './stores';

// === 페이지 (추후 추가) ===
// export * from './pages';

// === 메인 도메인 기능들 ===
// 가장 자주 사용되는 기능들을 명시적으로 export
export {
  // 컴포넌트
  BookingForm,
  
  // 훅
  useBooking,
  useBookings,
  useBookingForm,
  useTimeSlots,
  useAvailability,
  
  // 서비스
  createBookingApiService,
  
  // 스토어
  useBookingFormStore,
  useReservationStore,
  
  // 타입
  type Booking,
  type BookingStatus,
  type BookingFormData,
  type TimeRange
} from './components';

export {
  useBooking,
  useBookings,
  useBookingForm,
  useTimeSlots,
  useAvailability
} from './hooks';

export {
  createBookingApiService
} from './services';

export {
  useBookingFormStore,
  useReservationStore
} from './stores';

export type {
  Booking,
  BookingStatus,
  BookingFormData,
  TimeRange
} from './types';
