import { useState, useMemo, useCallback } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ReservationFilters, FilterState, DEFAULT_FILTERS, DateRangeFilter } from '../types/filterTypes';
import { Reservation } from '../utils/reservationTypes';
import { useDebounced } from './useDebounced';
import { sortByRelevance } from '../utils/searchHighlight';

export function useReservationFilters(reservations: Reservation[]) {
  const [filters, setFilters] = useState<ReservationFilters>(DEFAULT_FILTERS);
  
  // 검색어를 debounce 처리 (300ms 지연)
  const debouncedSearchQuery = useDebounced(filters.searchQuery, 300);

  // 날짜 범위 계산
  const getDateRange = useCallback((dateRange: DateRangeFilter) => {
    const now = new Date();
    
    switch (dateRange) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
      case 'this_week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }), // 월요일 시작
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'this_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case 'custom':
        return {
          start: filters.startDate,
          end: filters.endDate,
        };
      default:
        return null;
    }
  }, [filters.startDate, filters.endDate]);

  // 필터된 예약 목록 계산 (debounced 검색어 사용)
  const filteredReservations = useMemo(() => {
    let filtered = reservations;

    // 날짜 범위 필터
    if (filters.dateRange !== 'all') {
      const dateRange = getDateRange(filters.dateRange);
      if (dateRange?.start && dateRange?.end) {
        filtered = filtered.filter(reservation => {
          if (!reservation.reservation_date) return false;
          const reservationDate = parseISO(reservation.reservation_date);
          return isWithinInterval(reservationDate, {
            start: dateRange.start!,
            end: dateRange.end!,
          });
        });
      }
    }

    // 상태 필터
    if (filters.status !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === filters.status);
    }

    // 서비스 필터
    if (filters.serviceId) {
      filtered = filtered.filter(reservation => reservation.service_id === filters.serviceId);
    }

    // 검색 쿼리 필터 (debounced 검색어 사용)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(reservation => {
        const customerName = (reservation.customers?.nickname || reservation.customers?.email || '').toLowerCase();
        const customerPhone = (reservation.customers?.phone || '').toLowerCase();
        const reservationId = reservation.id.toLowerCase();
        
        return customerName.includes(query) || 
               customerPhone.includes(query) || 
               reservationId.includes(query);
      });

      // 검색어가 있을 때는 관련성 순으로 정렬
      filtered = sortByRelevance(
        filtered,
        debouncedSearchQuery,
        (reservation) => [
          reservation.customers?.nickname || '',
          reservation.customers?.email || '',
          reservation.customers?.phone || '',
          reservation.id,
          reservation.services?.name || '',
        ]
      );
    }

    return filtered;
  }, [reservations, filters, debouncedSearchQuery, getDateRange]);

  // 필터 상태 확인 (실제 검색어가 아닌 입력 중인 검색어 기준)
  const isFiltered = useMemo(() => {
    return filters.dateRange !== 'all' ||
           filters.status !== 'all' ||
           !!filters.serviceId ||
           !!filters.searchQuery.trim();
  }, [filters]);

  // 검색 중인지 확인 (debounced와 실제 검색어가 다를 때)
  const isSearching = useMemo(() => {
    return filters.searchQuery !== debouncedSearchQuery;
  }, [filters.searchQuery, debouncedSearchQuery]);

  // 필터 업데이트 함수들
  const updateDateRange = useCallback((dateRange: DateRangeFilter) => {
    setFilters(prev => ({ ...prev, dateRange }));
  }, []);

  const updateCustomDateRange = useCallback((startDate: Date | undefined, endDate: Date | undefined) => {
    setFilters(prev => ({ 
      ...prev, 
      dateRange: 'custom',
      startDate, 
      endDate 
    }));
  }, []);

  const updateStatus = useCallback((status: string) => {
    setFilters(prev => ({ ...prev, status: status as any }));
  }, []);

  const updateServiceId = useCallback((serviceId: string | undefined) => {
    setFilters(prev => ({ ...prev, serviceId }));
  }, []);

  const updateSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // 현재 검색어 반환 (하이라이트에 사용할 debounced 검색어)
  const getCurrentSearchQuery = useCallback(() => {
    return debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  const filterState: FilterState = {
    ...filters,
    isFiltered,
  };

  return {
    filters: filterState,
    filteredReservations,
    updateDateRange,
    updateCustomDateRange,
    updateStatus,
    updateServiceId,
    updateSearchQuery,
    resetFilters,
    totalCount: reservations.length,
    filteredCount: filteredReservations.length,
    isSearching, // 검색 중인지 여부
    getCurrentSearchQuery, // 하이라이트용 검색어
  };
} 