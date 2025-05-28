/**
 * Domains Index - All Domains Barrel Export
 * 모든 도메인을 통합하여 제공
 */

// Auth Domain
export * from './auth';

// Studio Domain  
export * from './studio';

// Booking Domain - TimeSlot 충돌 방지를 위해 명시적 export
export {
  // Components
  TimeRangeSelector,
  BookingForm,
  
  // Hooks
  useTimeSlots,
  useAvailability,
  
  // Services
  createBookingApiService,
  
  // Stores
  useBookingFormStore,
  useReservationStore,
  type CustomerFormData,
  type TimeRange,
  
  // Types (TimeSlot 제외)
  type Booking,
  type BookingStatus,
  type BookingFormData,
  type BookingDetail,
  type BookingSearchParams,
  type BookingStats
} from './booking';

// Booking 도메인의 TimeSlot은 BookingTimeSlot로 alias
export { type TimeSlot as BookingTimeSlot } from './booking/types/calendar';

// 추가 도메인들은 여기에 export 추가
// export * from './user';
// export * from './payment';
