/**
 * Booking 도메인 컴포넌트 통합 export
 * 예약 관련 모든 컴포넌트들을 통합 제공
 */

// 예약 폼 컴포넌트
export { BookingForm, default as BookingFormDefault } from './BookingForm';

// 시간 선택 컴포넌트
export { default as TimeRangeSelector } from './TimeRangeSelector';
export { default as TimeSlotGrid } from './TimeSlotGrid';

// 기존 코드와의 호환성을 위한 alias export
export {
  BookingForm as ReservationForm,
  default as TimeRangeSelectorAlias
} from './BookingForm';
