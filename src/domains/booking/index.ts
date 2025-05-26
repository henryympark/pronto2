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
// 실제로 존재하는 기능들만 명시적으로 export

// 훅 - 실제 존재하는 것들만
export {
  useTimeSlots,
  useAvailability
} from './hooks';

// TODO: 추후 구현될 예정인 exports들
// export {
//   // 컴포넌트
//   BookingForm,
//   
//   // 훅
//   useBooking,
//   useBookings,
//   useBookingForm,
//   
//   // 서비스
//   createBookingApiService,
//   
//   // 스토어
//   useBookingFormStore,
//   useReservationStore,
//   
//   // 타입
//   type Booking,
//   type BookingStatus,
//   type BookingFormData,
//   type TimeRange
// } from './components';

// TODO: 각 모듈이 구현되면 아래 exports들을 활성화
// export {
//   createBookingApiService
// } from './services';

// export {
//   useBookingFormStore,
//   useReservationStore
// } from './stores';

// export type {
//   Booking,
//   BookingStatus,
//   BookingFormData,
//   TimeRange
// } from './types';
