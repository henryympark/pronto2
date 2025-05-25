/**
 * 캐시 관련 상수들
 */
export const CACHE_KEYS = {
  USER_SESSION: 'user_session',
  SERVICES_LIST: 'services_list',
  SERVICE_DETAIL: (id: string) => `service_detail_${id}`,
  USER_RESERVATIONS: 'user_reservations',
  HEADER_AUTH: 'header_auth',
} as const;

export const CACHE_DURATION = {
  SHORT: 5 * 60, // 5분
  MEDIUM: 30 * 60, // 30분
  LONG: 60 * 60, // 1시간
  VERY_LONG: 24 * 60 * 60, // 24시간
} as const;