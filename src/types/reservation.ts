/**
 * 예약 상태 타입
 */
export type ReservationStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'modified';

/**
 * 예약 데이터 타입
 */
export type Reservation = {
  id: string;
  service_id: string;
  customer_id: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  
  // 가격 변동 관련 필드 (Phase 3-3)
  original_total_price?: number;
  recalculated_total_amount?: number;
  pending_payment_amount?: number;
  pending_refund_amount?: number;
};

/**
 * 예약 가능 시간 API 응답 타입
 */
export type AvailableTimesResponse = {
  operatingStartTime: string;
  operatingEndTime: string;
  unavailableSlots: string[];
  message?: string;
};

/**
 * 예약 생성 요청 타입
 */
export type CreateReservationRequest = {
  customerId?: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  totalPrice: number;
};

/**
 * 예약 생성 응답 타입
 */
export type CreateReservationResponse = {
  message: string;
  reservation: Reservation;
};

/**
 * 예약 목록 응답 타입
 */
export type ReservationsListResponse = {
  reservations: Reservation[];
};

/**
 * 예약 상세 응답 타입
 */
export type ReservationDetailResponse = {
  reservation: Reservation & {
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
  };
};

/**
 * 예약 상태 업데이트 요청 타입
 */
export type UpdateReservationStatusRequest = {
  status: ReservationStatus;
};

/**
 * 예약 상태 업데이트 응답 타입
 */
export type UpdateReservationStatusResponse = {
  message: string;
  reservation: Reservation;
};

/**
 * 예약 삭제 응답 타입
 */
export type DeleteReservationResponse = {
  message: string;
};

/**
 * 예약 이력 타입
 */
export type ReservationHistory = {
  id: string;
  reservation_id: string;
  action_type: 'created' | 'modified' | 'cancelled' | 'completed' | 'confirmed';
  action_description: string;
  old_data?: any;
  new_data?: any;
  performed_by?: string;
  performed_by_type: 'customer' | 'admin';
  created_at: string;
}; 