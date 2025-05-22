/**
 * FAQ 관련 기본 데이터
 * 
 * 이 파일은 현재 하드코딩된 FAQ 데이터를 관리합니다.
 * 추후 이 데이터는 DB에서 관리되고 API를 통해 제공될 예정입니다.
 */

/**
 * FAQ 항목 타입 정의
 */
export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * 기본 FAQ 데이터
 */
export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    question: "추가 인원은 얼마까지 가능한가요?",
    answer: "최대 6명까지 가능합니다. 인원 추가 시 사전에 알려주세요."
  },
  {
    question: "촬영 장비 대여가 가능한가요?",
    answer: "기본 조명 외 추가 장비는 사전 예약 시 별도 요금으로 대여 가능합니다."
  },
  {
    question: "예약 변경은 어떻게 하나요?",
    answer: "예약 변경은 이용 3일 전까지 가능하며, 마이페이지 > 예약 내역에서 변경하실 수 있습니다."
  },
  {
    question: "주차는 몇 대까지 가능한가요?",
    answer: "최대 2대까지 가능합니다. 추가 차량은 인근 공영주차장을 이용해주세요."
  }
];

/**
 * 서비스별 FAQ 데이터 조회 함수
 * (현재는 기본값만 반환하지만, 추후 서비스 ID에 따라 다른 FAQ 반환 가능)
 */
export const getServiceFaq = (serviceId?: string): FaqItem[] => {
  // 추후 서비스 ID에 따라 다른 FAQ 데이터 반환 로직 추가 예정
  return DEFAULT_FAQ_ITEMS;
}; 