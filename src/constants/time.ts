/**
 * 시간 관련 상수 정의
 */

// 운영 시간 설정
export const OPERATION_START_TIME = "06:00"; // 오전 6시부터
export const OPERATION_END_TIME = "23:30";   // 23:30까지 (24:00은 수동으로 추가)

// 타임 슬롯 간격 (분 단위)
export const TIME_SLOT_INTERVAL = 30;

// 예약 가능 최대 기간 (일 단위)
export const MAX_RESERVATION_DAYS_AHEAD = 90; // 3개월 