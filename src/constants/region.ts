/**
 * 지역 및 타임존 관련 상수 정의
 */

// 기본 타임존 설정
export const DEFAULT_TIMEZONE = 'Asia/Seoul';

// 지역별 타임존 매핑
export const REGION_TIMEZONES = {
  KOREA: 'Asia/Seoul',
  JAPAN: 'Asia/Tokyo',
  US_EAST: 'America/New_York',
  US_WEST: 'America/Los_Angeles',
};

// 날짜 형식
export const DATE_FORMATS = {
  DISPLAY: 'yyyy년 M월 d일 (eee)',  // 표시용 (2023년 5월 15일 (월))
  API: 'yyyy-MM-dd',                // API 통신용 (2023-05-15)
  DATABASE: 'yyyy-MM-dd',           // 데이터베이스 저장용 (2023-05-15)
}; 