/**
 * Booking 도메인 컴포넌트 통합 export
 * 예약 관련 모든 컴포넌트들을 통합 제공
 */

// 예약 폼 컴포넌트
export { BookingForm, default as BookingFormDefault } from './BookingForm';

// TODO: 추가 컴포넌트들이 이동되면 export 추가
// export { BookingCard } from './BookingCard';
// export { BookingCalendar } from './BookingCalendar';
// export { TimeSlotPicker } from './TimeSlotPicker';
// export { BookingStatus } from './BookingStatus';
// export { ReservationSidebar } from './ReservationSidebar';

// 기존 코드와의 호환성을 위한 alias export
export {
  BookingForm as ReservationForm
} from './BookingForm';
