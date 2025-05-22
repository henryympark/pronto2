/**
 * API 경로 관련 상수 정의
 */

export const API_PATHS = {
  // 서비스 관련 API
  SERVICES: {
    BASE: '/api/services',
    DETAIL: (serviceId: string) => `/api/services/${serviceId}`,
    AVAILABLE_TIMES: (serviceId: string) => `/api/services/${serviceId}/available-times`,
  },
  
  // 예약 관련 API
  RESERVATIONS: {
    BASE: '/api/reservations',
    DETAIL: (reservationId: string) => `/api/reservations/${reservationId}`,
    CANCEL: (reservationId: string) => `/api/reservations/${reservationId}/cancel`,
  },
  
  // 사용자 관련 API
  USER: {
    PROFILE: '/api/user/profile',
    RESERVATIONS: '/api/user/reservations',
  },
}; 