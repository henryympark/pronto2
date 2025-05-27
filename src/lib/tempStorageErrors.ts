/**
 * 임시 저장 시스템 에러 처리 및 로깅 유틸리티
 */

import { TempStorageError } from '@/types/tempStorage';

/**
 * 임시 저장 전용 에러 클래스
 */
export class TempStorageException extends Error {
  public readonly code: TempStorageError['code'];
  public readonly details?: any;

  constructor(code: TempStorageError['code'], message: string, details?: any) {
    super(message);
    this.name = 'TempStorageException';
    this.code = code;
    this.details = details;
  }

  /**
   * 에러를 TempStorageError 형태로 변환
   */
  toErrorObject(): TempStorageError {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * 임시 저장 에러 팩토리
 */
export const TempStorageErrors = {
  /**
   * 암호화 실패 에러
   */
  encryptionFailed(details?: any): TempStorageException {
    return new TempStorageException(
      'ENCRYPTION_FAILED',
      '데이터 암호화에 실패했습니다. 잠시 후 다시 시도해주세요.',
      details
    );
  },

  /**
   * 저장 공간 부족 에러
   */
  storageFull(details?: any): TempStorageException {
    return new TempStorageException(
      'STORAGE_FULL',
      '저장 공간이 부족합니다. 불필요한 데이터를 정리하고 다시 시도해주세요.',
      details
    );
  },

  /**
   * 데이터 만료 에러
   */
  expired(details?: any): TempStorageException {
    return new TempStorageException(
      'EXPIRED',
      '임시 저장된 데이터가 만료되었습니다. 예약 정보를 다시 입력해주세요.',
      details
    );
  },

  /**
   * 데이터 없음 에러
   */
  notFound(details?: any): TempStorageException {
    return new TempStorageException(
      'NOT_FOUND',
      '임시 저장된 데이터를 찾을 수 없습니다.',
      details
    );
  },

  /**
   * 잘못된 데이터 에러
   */
  invalidData(details?: any): TempStorageException {
    return new TempStorageException(
      'INVALID_DATA',
      '잘못된 데이터입니다. 입력 내용을 확인해주세요.',
      details
    );
  }
};

/**
 * 임시 저장 로거
 */
export class TempStorageLogger {
  private context: string;

  constructor(context: string = 'TempStorage') {
    this.context = context;
  }

  /**
   * 정보 로그
   */
  info(message: string, data?: any): void {
    console.log(`[${this.context}] ${message}`, data ? data : '');
  }

  /**
   * 경고 로그
   */
  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] ${message}`, data ? data : '');
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: any): void {
    console.error(`[${this.context}] ${message}`, error ? error : '');
    
    // 프로덕션 환경에서는 에러 모니터링 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorMonitoring(message, error);
    }
  }

  /**
   * 성공 로그
   */
  success(message: string, data?: any): void {
    console.log(`[${this.context}] ✅ ${message}`, data ? data : '');
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] 🔍 ${message}`, data ? data : '');
    }
  }

  /**
   * 에러 모니터링 서비스로 전송 (향후 구현)
   */
  private sendToErrorMonitoring(message: string, error?: any): void {
    // TODO: Sentry, LogRocket 등 에러 모니터링 서비스 연동
    // 예시:
    // Sentry.captureException(new Error(message), {
    //   extra: { context: this.context, error }
    // });
  }
}

/**
 * 전역 로거 인스턴스들
 */
export const tempStorageLogger = new TempStorageLogger('TempStorage');
export const tempStorageApiLogger = new TempStorageLogger('TempStorageAPI');
export const tempStorageManagerLogger = new TempStorageLogger('TempStorageManager');

/**
 * 에러 처리 유틸리티 함수들
 */
export const errorUtils = {
  /**
   * 일반 Error를 TempStorageException으로 변환
   */
  convertToTempStorageError(error: unknown): TempStorageException {
    if (error instanceof TempStorageException) {
      return error;
    }

    if (error instanceof Error) {
      // 일반적인 에러 메시지에 따라 분류
      if (error.message.includes('암호화') || error.message.includes('encryption')) {
        return TempStorageErrors.encryptionFailed(error.message);
      }
      if (error.message.includes('저장') || error.message.includes('storage')) {
        return TempStorageErrors.storageFull(error.message);
      }
      if (error.message.includes('만료') || error.message.includes('expired')) {
        return TempStorageErrors.expired(error.message);
      }
      if (error.message.includes('찾을 수 없') || error.message.includes('not found')) {
        return TempStorageErrors.notFound(error.message);
      }

      // 기본적으로 잘못된 데이터로 분류
      return TempStorageErrors.invalidData(error.message);
    }

    // 알 수 없는 에러
    return TempStorageErrors.invalidData('알 수 없는 오류가 발생했습니다.');
  },

  /**
   * 사용자 친화적인 에러 메시지 생성
   */
  getUserFriendlyMessage(error: TempStorageException): string {
    const baseMessages = {
      ENCRYPTION_FAILED: '보안 처리 중 문제가 발생했습니다.',
      STORAGE_FULL: '저장 공간이 부족합니다.',
      EXPIRED: '임시 저장 시간이 만료되었습니다.',
      NOT_FOUND: '저장된 정보를 찾을 수 없습니다.',
      INVALID_DATA: '입력 정보에 문제가 있습니다.'
    };

    const baseMessage = baseMessages[error.code] || '알 수 없는 오류가 발생했습니다.';
    
    const actionMessages = {
      ENCRYPTION_FAILED: '잠시 후 다시 시도해주세요.',
      STORAGE_FULL: '페이지를 새로고침하고 다시 시도해주세요.',
      EXPIRED: '예약 정보를 다시 입력해주세요.',
      NOT_FOUND: '예약 정보를 다시 입력해주세요.',
      INVALID_DATA: '입력 내용을 확인하고 다시 시도해주세요.'
    };

    const actionMessage = actionMessages[error.code] || '문제가 지속되면 고객센터에 문의해주세요.';

    return `${baseMessage} ${actionMessage}`;
  },

  /**
   * 에러를 토스트 메시지에 적합한 형태로 변환
   */
  getToastMessage(error: TempStorageException): {
    title: string;
    description: string;
    variant: 'destructive' | 'default';
  } {
    const titles = {
      ENCRYPTION_FAILED: '보안 오류',
      STORAGE_FULL: '저장 공간 부족',
      EXPIRED: '시간 만료',
      NOT_FOUND: '데이터 없음',
      INVALID_DATA: '입력 오류'
    };

    return {
      title: titles[error.code] || '오류',
      description: this.getUserFriendlyMessage(error),
      variant: 'destructive'
    };
  }
};

/**
 * 재시도 로직을 포함한 에러 처리 래퍼
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  context: string = 'Unknown'
): Promise<T> {
  const logger = new TempStorageLogger(context);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`시도 ${attempt}/${maxRetries}`);
      const result = await operation();
      
      if (attempt > 1) {
        logger.success(`${attempt}번째 시도에서 성공`);
      }
      
      return result;
    } catch (error) {
      logger.warn(`시도 ${attempt} 실패`, error);
      
      if (attempt === maxRetries) {
        logger.error('모든 재시도 실패', error);
        throw errorUtils.convertToTempStorageError(error);
      }
      
      // 지수 백오프 지연
      const delay = delayMs * Math.pow(2, attempt - 1);
      logger.debug(`${delay}ms 후 재시도`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // 이 코드는 실행되지 않지만 TypeScript를 위해 필요
  throw TempStorageErrors.invalidData('재시도 로직 오류');
} 