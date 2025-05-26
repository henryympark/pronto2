import { useState, useCallback } from 'react';
import { toast } from './use-toast';

/**
 * useApi hook
 * API 호출을 위한 공통 hook
 * 로딩 상태, 에러 처리, 성공/실패 토스트 등을 관리
 */

export interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (apiCall: () => Promise<T>, options?: UseApiOptions) => Promise<T | null>;
  reset: () => void;
}

export const useApi = <T = any>(): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    options: UseApiOptions = {}
  ): Promise<T | null> => {
    const {
      showSuccessToast = false,
      showErrorToast = true,
      successMessage = '성공적으로 처리되었습니다.',
      errorMessage = '처리 중 오류가 발생했습니다.'
    } = options;

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiCall();
      setData(result);
      
      if (showSuccessToast) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage;
      setError(errorMsg);
      
      if (showErrorToast) {
        toast.error(errorMsg);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
};

export default useApi;
