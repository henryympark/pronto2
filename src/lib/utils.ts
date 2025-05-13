import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppError, ErrorCode, ErrorSeverity } from "@/types";

/**
 * Tailwind CSS 클래스를 조합하는 유틸리티 함수
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 에러를 AppError 형식으로 변환하는 함수
 * 
 * @param error - 원본 에러 객체
 * @param defaultCode - 기본 에러 코드 (원본 에러가 AppError가 아닌 경우 사용)
 * @param defaultMessage - 기본 에러 메시지 (원본 에러가 메시지를 가지지 않는 경우 사용)
 * @param defaultUserMessage - 기본 사용자용 에러 메시지
 * @returns AppError 인스턴스
 */
export function handleError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  defaultMessage: string = "알 수 없는 오류가 발생했습니다.",
  defaultUserMessage?: string
): AppError {
  // 이미 AppError인 경우 그대로 반환
  if (error instanceof AppError) {
    return error;
  }
  
  // Error 인스턴스인 경우
  if (error instanceof Error) {
    return new AppError(
      defaultCode,
      error.message || defaultMessage,
      defaultUserMessage,
      ErrorSeverity.ERROR,
      { originalStack: error.stack },
      error
    );
  }
  
  // 문자열인 경우
  if (typeof error === 'string') {
    return new AppError(
      defaultCode,
      error,
      defaultUserMessage || error,
      ErrorSeverity.ERROR
    );
  }
  
  // 객체인 경우 (예: API 응답 에러)
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, any>;
    const message = errorObj.message || errorObj.error || defaultMessage;
    const details = { ...errorObj };
    
    return new AppError(
      defaultCode,
      message,
      defaultUserMessage || message,
      ErrorSeverity.ERROR,
      details
    );
  }
  
  // 그 외의 경우
  return new AppError(
    defaultCode,
    defaultMessage,
    defaultUserMessage || defaultMessage,
    ErrorSeverity.ERROR,
    { originalError: error }
  );
}

/**
 * 에러 로깅 함수
 * 
 * @param error - 로깅할 에러 객체
 * @param context - 추가 컨텍스트 정보
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const appError = error instanceof AppError 
    ? error 
    : handleError(error);
  
  const logData = {
    ...appError.toJSON(),
    context,
    timestamp: new Date().toISOString()
  };
  
  // 개발 환경에서는 콘솔에 로깅
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', logData);
    if (appError.originalError) {
      console.error('Original error:', appError.originalError);
    }
  }
  
  // 프로덕션 환경에서는 서버로 로깅 (구현 필요)
  // TODO: 프로덕션 환경에서 에러 로깅 서비스 연동
}

/**
 * 사용자 친화적인 에러 메시지를 생성하는 함수
 * 
 * @param error - 에러 객체
 * @param fallbackMessage - 기본 메시지
 * @returns 사용자 친화적인 에러 메시지
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  fallbackMessage: string = "요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    // 일반적인 에러 메시지를 사용자 친화적으로 변환
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.";
    }
    
    if (error.message.includes('timeout')) {
      return "서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
    }
    
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return "해당 작업을 수행할 권한이 없습니다. 로그인 후 다시 시도해주세요.";
    }
  }
  
  return fallbackMessage;
}
