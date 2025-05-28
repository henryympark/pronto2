/**
 * 예약 상태 타입
 */
export type ReservationStatus = 'pending' | 'confirmed' | 'canceled' | 'cancelled' | 'completed' | 'modified';

/**
 * 서비스 정보 타입
 */
export type ServiceInfo = {
  id: string;
  name: string;
  price_per_hour?: number;
  location?: string | null;
  image_url?: string | null;
};

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
  
  // 추가 예약 정보
  customer_name?: string;
  service?: ServiceInfo;
  company_name?: string;
  purpose?: string;
  car_number?: string;
  has_review?: boolean;
  
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
  action_type: 'created' | 'modified' | 'cancelled' | 'completed' | 'confirmed' | 'extended';
  action_description: string;
  old_data?: any;
  new_data?: any;
  performed_by?: string;
  performed_by_type: 'customer' | 'admin';
  created_at: string;
};

// ======= 예약 연장 관련 타입들 =======

/**
 * 예약 연장 가능성 확인 요청 타입
 */
export type CheckExtensionEligibilityRequest = {
  extensionMinutes: number; // 연장할 분 수 (30의 배수)
};

/**
 * 예약 연장 가능성 확인 응답 타입
 */
export type CheckExtensionEligibilityResponse = {
  eligible: boolean;
  reason?: string;
  availableSlots?: string[];
  additionalCost: number;
  timeDiscountAvailable: number;
  gracePeriodRemaining: number; // Grace Period 남은 분 수
};

/**
 * 쿠폰 사용 정보 타입
 */
export type CouponUsage = {
  couponId: string;
  minutes: number;
};

/**
 * 예약 연장 요청 타입
 */
export type ExtendReservationRequest = {
  extensionMinutes: number; // 연장할 분 수 (30의 배수)
  useAccumulatedTime: boolean; // 적립 시간 사용 여부
  useCoupons: string[]; // 사용할 쿠폰 ID 배열
};

/**
 * 예약 연장 응답 타입
 */
export type ExtendReservationResponse = {
  success: boolean;
  message?: string;
  error?: string;
  updatedReservation?: Reservation;
  timeUsed?: {
    accumulated: number; // 사용된 적립 시간 (분)
    coupons: CouponUsage[]; // 사용된 쿠폰들
  };
  additionalPaymentRequired?: number; // 추가 결제 필요 금액
};

/**
 * 웹훅 이벤트 페이로드 타입 - 예약 연장
 */
export type BookingExtendedWebhookPayload = {
  event: 'booking.extended';
  timestamp: string;
  data: {
    reservationId: string;
    customerId: string;
    originalEndTime: string;
    newEndTime: string;
    extensionMinutes: number;
    additionalCost: number;
    timeUsed: {
      accumulated: number;
      coupons: CouponUsage[];
    };
  };
}; 