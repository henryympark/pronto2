/**
 * 캐싱 관련 상수 정의
 */

// 캐싱 시간 (초 단위)
export const CACHE_DURATIONS = {
  // 예약 가능 시간 캐싱
  AVAILABLE_TIMES: {
    TODAY: 300,     // 오늘 날짜: 5분 (300초)
    FUTURE: 900,    // 미래 날짜: 15분 (900초)
  },
  
  // 서비스 정보 캐싱
  SERVICE_INFO: 3600,  // 1시간 (3600초)
  
  // 사용자 정보 캐싱
  USER_INFO: 1800,     // 30분 (1800초)
}; 