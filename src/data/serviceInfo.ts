/**
 * 서비스 정보 관련 기본 데이터
 * 
 * 이 파일은 현재 하드코딩된 서비스 정보 데이터를 관리합니다.
 * 추후 이 데이터는 DB에서 관리되고 API를 통해 제공될 예정입니다.
 */

/**
 * 시설 안내 기본 정보
 */
export const DEFAULT_FACILITY_INFO = {
  area: "30평 (99m²)",
  ceilingHeight: "3.5m",
  equipment: "기본 조명 세트, 간이 테이블, 의자, 배경지",
  amenities: "탈의실, 화장실, 대기실, Wi-Fi"
};

/**
 * 유의사항 기본 정보
 */
export const DEFAULT_NOTICE = [
  "예약 시간 준수 (초과 시 추가 요금 발생)",
  "스튜디오 내 취식 금지",
  "장비 사용 후 원위치",
  "퇴실 시 개인 물품 확인"
];

/**
 * 환불 정책 기본 정보
 */
export const DEFAULT_REFUND_POLICY = [
  "이용 7일 전: 100% 환불",
  "이용 3일 전: 70% 환불",
  "이용 1일 전: 50% 환불",
  "이용 당일: 환불 불가"
];

/**
 * 주차 안내 기본 정보
 */
export const DEFAULT_PARKING_INFO = "건물 내 지하주차장 이용 가능 (2시간 무료, 이후 시간당 2,000원)";

/**
 * 서비스 정보 유형 정의
 */
export type ServiceInfoType = {
  facilityInfo: typeof DEFAULT_FACILITY_INFO;
  notice: string[];
  refundPolicy: string[];
  parkingInfo: string;
};

/**
 * 서비스 정보 기본값 객체
 */
export const DEFAULT_SERVICE_INFO: ServiceInfoType = {
  facilityInfo: DEFAULT_FACILITY_INFO,
  notice: DEFAULT_NOTICE,
  refundPolicy: DEFAULT_REFUND_POLICY,
  parkingInfo: DEFAULT_PARKING_INFO
}; 