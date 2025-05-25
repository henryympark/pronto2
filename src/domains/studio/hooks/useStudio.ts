/**
 * useStudio Hook
 * 개별 스튜디오 정보 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { studioApi } from '../services';
import { useApi } from '@/shared/hooks';
import type { Studio } from '../types';

interface UseStudioProps {
  studioId: string;
  enabled?: boolean;
}

interface UseStudioReturn {
  studio: Studio | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useStudio = ({ 
  studioId, 
  enabled = true 
}: UseStudioProps): UseStudioReturn => {
  const [studio, setStudio] = useState<Studio | null>(null);
  const { execute, isLoading, error } = useApi();

  const fetchStudio = useCallback(async () => {
    if (!enabled || !studioId) return;

    const result = await execute(() => studioApi.getStudio(studioId));
    
    if (result.success && result.data) {
      setStudio(result.data);
    }
  }, [studioId, enabled, execute]);

  const refetch = useCallback(async () => {
    await fetchStudio();
  }, [fetchStudio]);

  useEffect(() => {
    fetchStudio();
  }, [fetchStudio]);

  return {
    studio,
    isLoading,
    error,
    refetch,
  };
};
