/**
 * 공통 타입 정의
 */

/**
 * 기본 엔티티 타입
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * 페이지네이션 타입
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 에러 심각도
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * 에러 코드
 */
export enum ErrorCode {
  // 일반 에러
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // 네트워크 에러
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  
  // 인증 에러
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // 데이터 에러
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  DATA_CONFLICT = 'DATA_CONFLICT',
  
  // 비즈니스 로직 에러
  RESERVATION_CONFLICT = 'RESERVATION_CONFLICT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * AppError 클래스
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly severity: ErrorSeverity;
  public readonly details?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

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
    this.userMessage = userMessage || message;
    this.severity = severity;
    this.details = details;
    this.originalError = originalError;
    this.timestamp = new Date();

    // Error 스탁 트레이스를 유지하기 위해
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 에러를 JSON 형태로 변환
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }

  /**
   * 사용자에게 표시할 메시지 얻기
   */
  getDisplayMessage(): string {
    return this.userMessage || this.message;
  }

  /**
   * 에러가 심각한지 확인
   */
  isCritical(): boolean {
    return this.severity === ErrorSeverity.CRITICAL || this.severity === ErrorSeverity.HIGH;
  }
}

/**
 * 옵션 타입
 */
export type Option<T> = T | null | undefined;

/**
 * 결과 타입 (성공 또는 에러)
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 로딩 상태 타입
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

/**
 * 색상 타입
 */
export type ColorVariant = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default';

/**
 * 크기 타입
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';