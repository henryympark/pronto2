/**
 * useAvailability 훅
 * 예약 가능성 체크 및 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient$ } from '@/lib/supabase';
import { AvailableTimesApiResponse } from '../services/bookingApi';
import { createBookingApiService } from '../services';

interface UseAvailabilityReturn {
  availableTimes: AvailableTimesApiResponse | null;
  loading: boolean;
  error: string | null;
  checkAvailability: (serviceId: string, date: string) => Promise<void>;
  isTimeAvailable: (time: string) => boolean;
}

/**
 * 예약 가능성 관리 훅
 */
export const useAvailability = (): UseAvailabilityReturn => {
  const supabase = createClient$();
  const [availableTimes, setAvailableTimes] = useState<AvailableTimesApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = createBookingApiService(supabase);

  const checkAvailability = useCallback(async (serviceId: string, date: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getAvailableTimes(serviceId, date);
      if (response.success) {
        setAvailableTimes(response);
      } else {
        setError(response.error || '가능 시간 조회 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const isTimeAvailable = useCallback((time: string): boolean => {
    if (!availableTimes) return false;
    return !availableTimes.unavailableSlots.includes(time);
  }, [availableTimes]);

  return {
    availableTimes,
    loading,
    error,
    checkAvailability,
    isTimeAvailable,
  };
};
