/**
 * 캐싱 관련 상수 정의
 */

// 캐싱 시간 (초 단위)
export const CACHE_DURATIONS = {
  // 예약 가능 시간 캐싱
  AVAILABLE_TIMES: {
    TODAY: 30,      // 오늘 날짜: 30초 (실시간 예약 현황 반영을 위해 짧게 설정)
    FUTURE: 900,    // 미래 날짜: 15분 (900초)
  },
  
  // 서비스 정보 캐싱
  SERVICE_INFO: 3600,  // 1시간 (3600초)
  
  // 사용자 정보 캐싱
  USER_INFO: 1800,     // 30분 (1800초)
}; 