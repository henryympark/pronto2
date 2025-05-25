/**
 * 시간 관련 상수들
 */
export const TIME_CONSTANTS = {
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  DAYS_IN_WEEK: 7,
  MILLISECONDS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  BUSINESS_HOURS: {
    START: 9, // 오전 9시
    END: 22,  // 오후 10시
  },
  RESERVATION: {
    MIN_ADVANCE_HOURS: 1, // 최소 1시간 전 예약
    MAX_ADVANCE_DAYS: 30, // 최대 30일 전 예약
    SLOT_DURATION_MINUTES: 60, // 기본 예약 슬롯 시간
  },
} as const;

export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'YYYY년 MM월 DD일',
  TIME: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm',
  KOREAN_DATE: 'MM월 DD일 (ddd)',
  KOREAN_DATETIME: 'MM월 DD일 (ddd) HH:mm',
} as const;