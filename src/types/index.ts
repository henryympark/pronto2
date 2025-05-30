/**
 * 공통 타입 정의 파일
 * 
 * 이 파일은 프로젝트 전반에서 사용되는 공통 타입들을 정의하고 export합니다.
 * 특정 기능에 종속된 타입은 해당 기능의 타입 파일에 정의하고, 이 파일에서 re-export합니다.
 */

// 기존 타입 re-export
export * from './reservation';
export * from './services';
export * from './api';

/**
 * 타임 슬롯 타입
 * 
 * @property time - 시간을 "HH:MM" 형식의 문자열로 표현 (예: "09:30")
 * @property status - 슬롯의 상태를 나타냄
 *   - 'available': 예약 가능한 상태
 *   - 'unavailable': 예약 불가능한 상태 (이미 예약됨, 운영 시간 외, 차단됨 등)
 *   - 'selected': 사용자가 현재 선택한 상태
 *   - 'reserved': 이미 예약된 상태 (선택적으로 사용)
 */
export interface TimeSlot {
  /** 시간을 "HH:MM" 형식으로 표현 (예: "09:30") */
  time: string;
  
  /** 
   * 슬롯의 상태
   * - 'available': 예약 가능
   * - 'unavailable': 예약 불가능
   * - 'selected': 현재 선택됨
   * - 'reserved': 이미 예약됨 (선택적)
   */
  status: 'available' | 'unavailable' | 'selected' | 'reserved';
}

/**
 * 운영시간 타입
 */
export interface OperatingHours {
  start: string;
  end: string;
  isClosed: boolean;
  message: string | null;
}

/**
 * 사용자 역할 타입
 */
export type UserRole = 'customer' | 'admin';

/**
 * 권한 타입
 */
export type Permission = 'read' | 'write' | 'delete' | 'admin';

/**
 * 리소스 타입
 */
export type Resource = 'customers' | 'reviews' | 'reservations' | 'services';

/**
 * 인증된 사용자 정보 타입 (JWT metadata 기반)
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  nickname?: string;
}

/**
 * JWT 페이로드 타입
 */
export interface JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email: string;
  phone: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    role?: UserRole;
  };
  role: string;
}

/**
 * 고객 정보 타입 (수정됨 - 새로운 DB 구조 반영)
 * 
 * @property id - 고객 ID (UUID, auth.users.id와 동일한 값)
 * @property email - 이메일 주소
 * @property role - 사용자 역할 (customer, admin)
 * @property nickname - 닉네임
 * @property phone - 전화번호
 * @property auth_provider - 인증 제공자 (email, kakao, naver 등)
 * @property profile_image - 프로필 이미지 URL
 * @property created_at - 생성 일시
 * @property updated_at - 수정 일시
 * @property accumulated_time_minutes - 적립된 시간 (분 단위)
 * @property memo - 관리자 메모
 * @property is_active - 활성 상태 여부
 */
export interface Customer {
  /** 고객 ID (UUID, auth.users.id와 동일한 값) */
  id: string;
  /** 이메일 주소 */
  email: string;
  /** 사용자 역할 */
  role: UserRole;
  /** 닉네임 */
  nickname?: string;
  /** 전화번호 */
  phone?: string;
  /** 인증 제공자 (email, kakao, naver 등) */
  auth_provider: string;
  /** 프로필 이미지 URL */
  profile_image?: string;
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
  /** 적립된 시간 (분 단위) */
  accumulated_time_minutes: number;
  /** 관리자 메모 */
  memo?: string;
  /** 활성 상태 여부 */
  is_active: boolean;
}

/**
 * 에러 코드 타입
 * 
 * 애플리케이션에서 발생하는 다양한 에러 상황에 대한 코드 정의
 */
export enum ErrorCode {
  // 인증 관련 에러
  UNAUTHORIZED = 'unauthorized',
  INVALID_CREDENTIALS = 'invalid_credentials',
  SESSION_EXPIRED = 'session_expired',
  
  // 입력값 검증 에러
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',
  
  // 데이터베이스 관련 에러
  DATABASE_ERROR = 'database_error',
  RECORD_NOT_FOUND = 'record_not_found',
  DUPLICATE_RECORD = 'duplicate_record',
  
  // 예약 관련 에러
  RESERVATION_CONFLICT = 'reservation_conflict',
  RESERVATION_UNAVAILABLE = 'reservation_unavailable',
  RESERVATION_EXPIRED = 'reservation_expired',
  
  // API 요청 관련 에러
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  
  // 기타 에러
  UNKNOWN_ERROR = 'unknown_error',
  NOT_IMPLEMENTED = 'not_implemented'
}

/**
 * 에러 심각도 타입
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 애플리케이션 에러 클래스
 * 
 * 애플리케이션 전반에서 발생하는 에러를 일관되게 처리하기 위한 클래스
 */
export class AppError extends Error {
  /** 에러 코드 */
  code: ErrorCode;
  
  /** 에러 심각도 */
  severity: ErrorSeverity;
  
  /** 사용자에게 표시할 메시지 */
  userMessage: string;
  
  /** 추가 정보 (디버깅 등에 활용) */
  details?: Record<string, any>;
  
  /** 원본 에러 (다른 에러를 래핑하는 경우) */
  originalError?: Error;
  
  /**
   * @param code - 에러 코드
   * @param message - 개발자용 에러 메시지
   * @param userMessage - 사용자용 에러 메시지 (생략 시 message와 동일)
   * @param severity - 에러 심각도 (기본값: ERROR)
   * @param details - 추가 정보
   * @param originalError - 원본 에러
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.userMessage = userMessage || message;
    this.details = details;
    this.originalError = originalError;
    
    // Error 클래스를 상속할 때 프로토타입 체인 유지를 위한 설정
    Object.setPrototypeOf(this, AppError.prototype);
  }
  
  /**
   * 에러 객체를 로깅 가능한 형태로 변환
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      details: this.details,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  created_at: string;
}

/**
 * 리뷰 타입 (수정됨 - 새로운 외래키 관계 반영)
 * 
 * @property id - 리뷰 ID
 * @property customer_id - 고객 ID (customers.id를 참조하도록 명확화)
 * @property service_id - 서비스 ID
 * @property reservation_id - 예약 ID
 * @property rating - 별점 (1-5)
 * @property content - 리뷰 내용
 * @property is_hidden - 숨김 여부
 * @property created_at - 생성 일시
 * @property updated_at - 수정 일시
 * @property deleted_at - 삭제 일시 (소프트 삭제)
 * @property customer - 조인된 고객 정보 (옵셔널)
 * @property service - 조인된 서비스 정보 (옵셔널)
 * @property images - 조인된 이미지 정보 (옵셔널)
 */
export interface Review {
  id: string;
  /** 고객 ID (customers.id를 참조하도록 명확화) */
  customer_id: string;
  service_id: string;
  reservation_id: string;
  rating: number;
  content: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  
  // 조인된 데이터 (옵셔널)
  customer?: {
    id: string;
    nickname: string;
    email: string;
  };
  service?: {
    id: string;
    name: string;
  };
  images?: ReviewImage[];
}

export interface ReviewFormData {
  rating: number;
  content: string;
  images?: File[];
}

export interface CustomerCoupon {
  /** 쿠폰 ID (UUID) */
  id: string;
  /** 고객 ID (UUID) */
  customer_id: string;
  /** 쿠폰 시간 (분 단위) */
  minutes: number;
  /** 사용 여부 */
  is_used: boolean;
  /** 사용 시간 */
  used_at: string | null;
  /** 사용된 예약 ID */
  used_reservation_id: string | null;
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
  /** 만료 시간 */
  expires_at: string | null;
  /** 부여한 운영자 ID */
  granted_by: string | null;
} 