/**
 * useStudios Hook
 * 스튜디오 목록 및 검색 관리
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { studioApi } from '../services';
import { useApi } from '@/shared/hooks';
import { validateSearchParams, filterStudios, sortStudios } from '../services/studioUtils';
import type { Studio, StudioSearchParams } from '../types';

interface UseStudiosProps {
  initialParams?: StudioSearchParams;
  enabled?: boolean;
  autoFetch?: boolean;
}

interface UseStudiosReturn {
  studios: Studio[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  searchParams: StudioSearchParams;
  updateSearchParams: (params: Partial<StudioSearchParams>) => void;
  resetSearchParams: () => void;
  search: () => Promise<void>;
  refetch: () => Promise<void>;
  isValidSearch: boolean;
  validationErrors: string[];
}

const DEFAULT_PARAMS: StudioSearchParams = {
  page: 1,
  limit: 20,
  sortBy: 'rating',
};

export const useStudios = ({ 
  initialParams = DEFAULT_PARAMS,
  enabled = true,
  autoFetch = true
}: UseStudiosProps = {}): UseStudiosReturn => {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchParams, setSearchParams] = useState<StudioSearchParams>({
    ...DEFAULT_PARAMS,
    ...initialParams,
  });

  const { execute, isLoading, error } = useApi();

  // 검색 파라미터 유효성 검사
  const validation = useMemo(() => 
    validateSearchParams(searchParams), 
    [searchParams]
  );

  const fetchStudios = useCallback(async () => {
    if (!enabled || !validation.isValid) return;

    const result = await execute(() => studioApi.getStudios(searchParams));
    
    if (result.success && result.data) {
      setStudios(result.data.studios);
      setTotalCount(result.data.total);
      setCurrentPage(result.data.page);
      setTotalPages(result.data.totalPages);
    }
  }, [searchParams, enabled, validation.isValid, execute]);

  const updateSearchParams = useCallback((params: Partial<StudioSearchParams>) => {
    setSearchParams(prev => ({
      ...prev,
      ...params,
      // 검색 조건이 변경되면 첫 페이지로 리셋
      page: params.page !== undefined ? params.page : 1,
    }));
  }, []);

  const resetSearchParams = useCallback(() => {
    setSearchParams(DEFAULT_PARAMS);
  }, []);

  const search = useCallback(async () => {
    await fetchStudios();
  }, [fetchStudios]);

  const refetch = useCallback(async () => {
    await fetchStudios();
  }, [fetchStudios]);

  // 자동 페치
  useEffect(() => {
    if (autoFetch) {
      fetchStudios();
    }
  }, [fetchStudios, autoFetch]);

  return {
    studios,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    searchParams,
    updateSearchParams,
    resetSearchParams,
    search,
    refetch,
    isValidSearch: validation.isValid,
    validationErrors: validation.errors,
  };
};
