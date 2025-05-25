/**
 * Booking 도메인 핵심 타입 정의
 * 기존 src/types/reservation.ts에서 이동하여 도메인별로 관리
 */

/**
 * 예약 상태 타입
 * - pending: 대기중
 * - confirmed: 확정
 * - canceled: 취소
 * - completed: 완료
 * - modified: 수정됨
 */
export type BookingStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'modified';

/**
 * 예약 데이터 핵심 타입
 */
export interface Booking {
  id: string;
  service_id: string;
  customer_id: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  
  // 가격 변동 관련 필드 (Phase 3-3)
  original_total_price?: number;
  recalculated_total_amount?: number;
  pending_payment_amount?: number;
  pending_refund_amount?: number;
}

/**
 * 예약 상세 정보 (join된 데이터 포함)
 */
export interface BookingDetail extends Booking {
  services: {
    name: string;
    price_per_hour: number;
    location: string | null;
    image_url: string | null;
  };
  customers?: {
    email: string;
    nickname: string | null;
    phone: string | null;
  } | null;
}

/**
 * 예약 생성 요청 데이터
 */
export interface CreateBookingRequest {
  customerId?: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  totalPrice: number;
}

/**
 * 예약 업데이트 요청 데이터
 */
export interface UpdateBookingRequest {
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  totalPrice?: number;
  status?: BookingStatus;
}

/**
 * 예약 검색/필터링 파라미터
 */
export interface BookingSearchParams {
  userId?: string;
  studioId?: string;
  serviceId?: string;
  status?: BookingStatus | BookingStatus[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * 예약 통계 정보
 */
export interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  canceledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
}
