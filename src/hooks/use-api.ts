"use client";

import { useState, useCallback } from 'react';
import { AppError, ErrorCode } from '@/types';
import { handleError, logError } from '@/lib/utils';

interface UseApiOptions<T> {
  /** 초기 데이터 (선택 사항) */
  initialData?: T;
  /** 자동으로 에러를 로깅할지 여부 (기본값: true) */
  autoLogError?: boolean;
  /** 에러 발생 시 호출할 콜백 함수 */
  onError?: (error: AppError) => void;
  /** 성공 시 호출할 콜백 함수 */
  onSuccess?: (data: T) => void;
}

interface ApiState<T> {
  /** API 호출 결과 데이터 */
  data: T | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 상태 */
  error: AppError | null;
}

/**
 * API 호출을 위한 커스텀 훅
 * 
 * 데이터 페칭, 로딩 상태, 에러 처리를 관리합니다.
 * 
 * @param options - API 호출 옵션
 * @returns API 상태 및 호출 함수
 */
export function useApi<T = any>(options: UseApiOptions<T> = {}) {
  const {
    initialData = null,
    autoLogError = true,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: initialData as T | null,
    isLoading: false,
    error: null
  });

  /**
   * API 호출 함수
   * 
   * @param apiCall - API 호출 Promise를 반환하는 함수
   * @param errorCode - 에러 발생 시 사용할 에러 코드
   * @returns API 호출 결과
   */
  const execute = useCallback(
    async <R = T>(
      apiCall: () => Promise<R>,
      errorCode: ErrorCode = ErrorCode.API_ERROR
    ): Promise<R | null> => {
      try {
        // 로딩 상태 설정
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // API 호출 실행
        const result = await apiCall();
        
        // 성공 상태 설정
        setState(prev => ({ ...prev, data: result as unknown as T, isLoading: false }));
        
        // 성공 콜백 호출
        if (onSuccess) {
          onSuccess(result as unknown as T);
        }
        
        return result;
      } catch (error) {
        // 에러 처리
        const appError = handleError(error, errorCode);
        
        // 에러 상태 설정
        setState(prev => ({ ...prev, error: appError, isLoading: false }));
        
        // 에러 로깅
        if (autoLogError) {
          logError(appError);
        }
        
        // 에러 콜백 호출
        if (onError) {
          onError(appError);
        }
        
        return null;
      }
    },
    [autoLogError, onError, onSuccess]
  );

  /**
   * 상태 초기화 함수
   */
  const reset = useCallback(() => {
    setState({
      data: initialData as T | null,
      isLoading: false,
      error: null
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset
  };
}

/**
 * API 요청 함수
 * 
 * 일반적인 fetch 요청을 래핑하여 에러 처리 및 응답 처리를 통합합니다.
 * 
 * @param url - API 엔드포인트 URL
 * @param options - fetch 옵션
 * @returns 응답 데이터
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // 기본 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // API 요청 실행
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // 응답 데이터 파싱
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // 에러 응답 처리
    if (!response.ok) {
      const errorMessage = typeof data === 'object' && data.message
        ? data.message
        : `API 요청 실패: ${response.status} ${response.statusText}`;
      
      const errorCode = getErrorCodeFromStatus(response.status);
      
      throw new AppError(
        errorCode,
        errorMessage,
        '요청 처리 중 오류가 발생했습니다.',
        undefined,
        {
          status: response.status,
          statusText: response.statusText,
          url,
          responseData: data
        }
      );
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // 네트워크 오류 등 기타 오류 처리
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new AppError(
          ErrorCode.TIMEOUT_ERROR,
          '요청 시간이 초과되었습니다.',
          '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        );
      }
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new AppError(
          ErrorCode.NETWORK_ERROR,
          '네트워크 연결 오류가 발생했습니다.',
          '인터넷 연결을 확인해주세요.'
        );
      }
    }
    
    // 기타 오류
    throw handleError(
      error,
      ErrorCode.API_ERROR,
      'API 요청 중 오류가 발생했습니다.'
    );
  }
}

/**
 * HTTP 상태 코드에 따른 에러 코드 반환
 */
function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.INVALID_INPUT;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.UNAUTHORIZED;
    case 404:
      return ErrorCode.RECORD_NOT_FOUND;
    case 409:
      return ErrorCode.DUPLICATE_RECORD;
    case 422:
      return ErrorCode.VALIDATION_ERROR;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCode.API_ERROR;
    default:
      return ErrorCode.UNKNOWN_ERROR;
  }
} 