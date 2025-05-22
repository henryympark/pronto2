/**
 * API 응답 타입 정의
 * 
 * 이 파일은 API 응답 데이터의 타입을 정의합니다.
 * 명확한 타입 정의를 통해 데이터 구조를 예측 가능하게 만들고,
 * 런타임 오류를 방지합니다.
 */

import { Reservation, Service } from './index';

/**
 * API 응답의 기본 구조
 */
export interface ApiResponse<T> {
  /** API 응답 데이터 */
  data?: T;
  /** 성공 여부 */
  success?: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 상태 메시지 */
  message?: string;
}

/**
 * 예약 가능 시간 API 응답
 */
export interface AvailableTimesApiResponse {
  /** 예약 날짜 (YYYY-MM-DD) */
  date: string;
  /** 운영 시작 시간 (HH:MM) */
  operatingStartTime: string;
  /** 운영 종료 시간 (HH:MM) */
  operatingEndTime: string;
  /** 예약 불가능한 시간 슬롯 목록 */
  unavailableSlots: string[];
  /** 현재 시간 (오늘 날짜인 경우에만) */
  currentTime: string | null;
  /** 휴무일 여부 */
  isClosed: boolean;
  /** 추가 메시지 */
  message: string | null;
}

/**
 * 예약 목록 API 응답
 */
export interface ReservationsApiResponse {
  /** 예약 목록 */
  reservations: Reservation[];
}

/**
 * 서비스 목록 API 응답
 */
export interface ServicesApiResponse {
  /** 서비스 목록 */
  services: Service[];
}

/**
 * 서비스 상세 API 응답
 */
export interface ServiceDetailApiResponse {
  /** 서비스 상세 정보 */
  service: Service & {
    /** 서비스 이미지 URL 목록 */
    images?: string[];
    /** 서비스 리뷰 목록 */
    reviews?: {
      id: string;
      rating: number;
      comment: string;
      created_at: string;
      customer_name?: string;
    }[];
  };
}

/**
 * 예약 생성/수정 API 응답
 */
export interface ReservationMutationApiResponse {
  /** 성공 메시지 */
  message: string;
  /** 생성/수정된 예약 정보 */
  reservation: Reservation;
}

/**
 * 고객 정보 API 응답
 */
export interface CustomerApiResponse {
  /** 고객 ID */
  id: string;
  /** 이메일 */
  email?: string;
  /** 닉네임 */
  nickname?: string;
  /** 전화번호 */
  phone?: string;
  /** 인증 제공자 */
  auth_provider: string;
  /** 역할 */
  role: string;
  /** 활성 상태 */
  is_active: boolean;
  /** 적립된 시간 (분) */
  accumulated_time_minutes: number;
  /** 생성일 */
  created_at: string;
}

/**
 * 고객 목록 API 응답
 */
export interface CustomersApiResponse {
  /** 고객 목록 */
  customers: CustomerApiResponse[];
} 