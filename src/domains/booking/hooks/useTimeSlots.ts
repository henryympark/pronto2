/**
 * useTimeSlots 훅
 * 시간 슬롯 및 예약 가능 시간 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { TimeSlot, Booking } from '../types';
import { generateTimeSlots, createBookingApiService } from '../services';

interface UseTimeSlotsReturn {
  timeSlots: TimeSlot[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * 시간 슬롯 관리 훅
 */
export const useTimeSlots = (
  serviceId: string | null,
  date: string, // YYYY-MM-DD
  startHour: number = 9,
  endHour: number = 22
): UseTimeSlotsReturn => {
  const supabase = useSupabaseClient();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = createBookingApiService(supabase);

  const refresh = useCallback(async () => {
    if (!serviceId || !date) {
      setTimeSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateObj = new Date(date);
      const existingBookings = await apiService.getBookingsByDate(serviceId, dateObj);
      
      const slots = generateTimeSlots(
        startHour,
        endHour,
        60, // 1시간 간격
        existingBookings,
        date
      );
      
      setTimeSlots(slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : '시간 슬롯 로드 오류');
    } finally {
      setLoading(false);
    }
  }, [serviceId, date, startHour, endHour, apiService]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    timeSlots,
    loading,
    error,
    refresh,
  };
};
