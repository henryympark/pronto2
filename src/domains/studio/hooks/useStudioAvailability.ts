/**
 * useStudioAvailability Hook
 * 스튜디오 예약 가능 시간 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { studioApi } from '../services';
import { useApi } from '@/shared/hooks';
import type { StudioAvailability } from '../types';

interface UseStudioAvailabilityProps {
  studioId: string;
  startDate: string;
  endDate: string;
  enabled?: boolean;
}

interface UseStudioAvailabilityReturn {
  availability: StudioAvailability[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getAvailableSlots: (date: string) => StudioAvailability['timeSlots'];
  isTimeSlotAvailable: (date: string, startTime: string) => boolean;
}

export const useStudioAvailability = ({ 
  studioId, 
  startDate, 
  endDate,
  enabled = true 
}: UseStudioAvailabilityProps): UseStudioAvailabilityReturn => {
  const [availability, setAvailability] = useState<StudioAvailability[]>([]);
  const { execute, isLoading, error } = useApi();

  const fetchAvailability = useCallback(async () => {
    if (!enabled || !studioId || !startDate || !endDate) return;

    const result = await execute(() => 
      studioApi.getStudioAvailability(studioId, startDate, endDate)
    );
    
    if (result.success && result.data) {
      setAvailability(result.data);
    }
  }, [studioId, startDate, endDate, enabled, execute]);

  const refetch = useCallback(async () => {
    await fetchAvailability();
  }, [fetchAvailability]);

  const getAvailableSlots = useCallback((date: string) => {
    const dayAvailability = availability.find(a => a.date === date);
    return dayAvailability?.timeSlots.filter(slot => slot.isAvailable) || [];
  }, [availability]);

  const isTimeSlotAvailable = useCallback((date: string, startTime: string) => {
    const dayAvailability = availability.find(a => a.date === date);
    if (!dayAvailability) return false;
    
    const slot = dayAvailability.timeSlots.find(s => s.startTime === startTime);
    return slot?.isAvailable || false;
  }, [availability]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    availability,
    isLoading,
    error,
    refetch,
    getAvailableSlots,
    isTimeSlotAvailable,
  };
};
