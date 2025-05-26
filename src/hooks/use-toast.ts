// import { toast as toastRadix } from '@radix-ui/react-toast';

/**
 * Toast hook for Pronto2
 * Radix UI Toast 컴포넌트를 기반으로 한 간단한 toast 시스템
 */

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'default' | 'destructive' | 'success';
}

// 전역 toast 상태 관리를 위한 간단한 이벤트 시스템
const toastEvents = new EventTarget();

// 기본 toast 함수 (호환성을 위해)
function showToastCompat(options: ToastOptions) {
  showToast(options);
}

export const toast = Object.assign(showToastCompat, {
  /**
   * 성공 메시지 표시
   */
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      description: message,
      variant: 'success'
    });
  },

  /**
   * 에러 메시지 표시
   */
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      description: message,
      variant: 'destructive'
    });
  },

  /**
   * 일반 메시지 표시
   */
  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      description: message,
      variant: 'default'
    });
  },

  /**
   * 커스텀 토스트 표시
   */
  custom: (options: ToastOptions) => {
    showToast(options);
  }
});

function showToast(options: ToastOptions) {
  const event = new CustomEvent('toast', { detail: options });
  toastEvents.dispatchEvent(event);
  
  // 콘솔에도 출력 (개발 중 디버깅용)
  if (process.env.NODE_ENV === 'development') {
    const prefix = options.variant === 'destructive' ? '❌' : 
                   options.variant === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} Toast:`, options.description || options.title);
  }
}

/**
 * Toast 이벤트를 구독하는 hook
 * Toast Provider에서 사용
 */
export const useToastEvents = () => {
  const addEventListener = (callback: (options: ToastOptions) => void) => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ToastOptions>;
      callback(customEvent.detail);
    };
    
    toastEvents.addEventListener('toast', handler);
    
    return () => {
      toastEvents.removeEventListener('toast', handler);
    };
  };

  return { addEventListener };
};

/**
 * 기존 useToast 훅 호환성을 위한 함수
 */
export const useToast = () => {
  return { toast };
};

// 기본 export
export default toast;
