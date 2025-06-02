import { useState, useMemo, useCallback } from 'react';
import { subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { CustomerFilters, FilterState, DEFAULT_FILTERS, ActivityFilter, FrequencyFilter, CustomerTypeFilter, StatusFilter } from '../types/filterTypes';
import { Customer } from '@/types';
import { useDebounced } from '../../reservations/hooks/useDebounced';

export function useCustomerFilters(customers: Customer[]) {
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);
  
  // 검색어를 debounce 처리 (300ms 지연)
  const debouncedSearchQuery = useDebounced(filters.searchQuery, 300);

  // 활성도 날짜 범위 계산
  const getActivityDateRange = useCallback((activity: ActivityFilter) => {
    const now = new Date();
    
    switch (activity) {
      case 'recent_week':
        return subWeeks(now, 1);
      case 'recent_month':
        return subMonths(now, 1);
      case 'recent_3months':
        return subMonths(now, 3);
      case 'recent_6months':
        return subMonths(now, 6);
      default:
        return null;
    }
  }, []);

  // 필터된 고객 목록 계산 (debounced 검색어 사용)
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // 상태 필터
    if (filters.status !== 'all') {
      filtered = filtered.filter(customer => {
        if (filters.status === 'active') {
          return customer.is_active === true;
        } else if (filters.status === 'inactive') {
          return customer.is_active === false;
        }
        return true;
      });
    }

    // 활성도 필터 (방문 기간별)
    if (filters.activity !== 'all') {
      if (filters.activity === 'no_visit') {
        // 방문 기록이 없는 고객
        filtered = filtered.filter(customer => 
          !customer.last_visit_date || customer.total_visit_count === 0
        );
      } else {
        // 특정 기간 내 방문한 고객
        const activityDate = getActivityDateRange(filters.activity);
        if (activityDate) {
          filtered = filtered.filter(customer => {
            if (!customer.last_visit_date) return false;
            const lastVisitDate = new Date(customer.last_visit_date);
            return isAfter(lastVisitDate, activityDate);
          });
        }
      }
    }

    // 방문 빈도 필터
    if (filters.frequency !== 'all') {
      filtered = filtered.filter(customer => {
        const visitCount = customer.total_visit_count || 0;
        
        switch (filters.frequency) {
          case 'new_customer':
            return visitCount <= 1;
          case 'returning_customer':
            return visitCount >= 2 && visitCount <= 5;
          case 'regular_customer':
            return visitCount >= 6;
          default:
            return true;
        }
      });
    }

    // 고객 유형 필터
    if (filters.customerType !== 'all') {
      filtered = filtered.filter(customer => {
        switch (filters.customerType) {
          case 'vip':
            return customer.is_vip === true;
          case 'business':
            return !!(customer.company_name && customer.company_name.trim());
          case 'general':
            return customer.is_vip !== true && (!customer.company_name || !customer.company_name.trim());
          default:
            return true;
        }
      });
    }

    // 태그 필터 (현재는 기본 구조만, 실제 태그 조인은 추후 구현)
    if (filters.selectedTagIds.length > 0) {
      // TODO: 태그 정보를 포함한 고객 데이터가 필요
      // 현재는 기본 구조만 제공
    }

    // 검색 쿼리 필터 (debounced 검색어 사용)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(customer => {
        const nickname = (customer.nickname || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const companyName = (customer.company_name || '').toLowerCase();
        const memo = (customer.memo || '').toLowerCase();
        
        return nickname.includes(query) || 
               email.includes(query) || 
               phone.includes(query) ||
               companyName.includes(query) ||
               memo.includes(query);
      });

      // 검색어가 있을 때는 관련성 순으로 정렬
      filtered = sortByRelevance(
        filtered,
        debouncedSearchQuery,
        (customer) => [
          customer.nickname || '',
          customer.email || '',
          customer.phone || '',
          customer.company_name || '',
          customer.memo || '',
        ]
      );
    }

    return filtered;
  }, [customers, filters, debouncedSearchQuery, getActivityDateRange]);

  // 관련성 정렬 함수 (Phase 1에서 재사용)
  const sortByRelevance = useCallback((
    items: Customer[],
    searchQuery: string,
    getSearchFields: (item: Customer) => string[]
  ) => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    
    return items.sort((a, b) => {
      const aFields = getSearchFields(a);
      const bFields = getSearchFields(b);
      
      // 정확한 매치 점수 계산
      const aScore = aFields.reduce((score, field) => {
        const fieldLower = field.toLowerCase();
        if (fieldLower === query) return score + 100; // 정확한 매치
        if (fieldLower.startsWith(query)) return score + 50; // 시작 매치
        if (fieldLower.includes(query)) return score + 10; // 포함 매치
        return score;
      }, 0);
      
      const bScore = bFields.reduce((score, field) => {
        const fieldLower = field.toLowerCase();
        if (fieldLower === query) return score + 100;
        if (fieldLower.startsWith(query)) return score + 50;
        if (fieldLower.includes(query)) return score + 10;
        return score;
      }, 0);
      
      return bScore - aScore; // 높은 점수가 먼저
    });
  }, []);

  // 필터 상태 확인 (실제 검색어가 아닌 입력 중인 검색어 기준)
  const isFiltered = useMemo(() => {
    return filters.activity !== 'all' ||
           filters.frequency !== 'all' ||
           filters.customerType !== 'all' ||
           filters.status !== 'all' ||
           filters.selectedTagIds.length > 0 ||
           !!filters.searchQuery.trim();
  }, [filters]);

  // 검색 중인지 확인 (debounced와 실제 검색어가 다를 때)
  const isSearching = useMemo(() => {
    return filters.searchQuery !== debouncedSearchQuery;
  }, [filters.searchQuery, debouncedSearchQuery]);

  // 필터 업데이트 함수들
  const updateActivity = useCallback((activity: ActivityFilter) => {
    setFilters(prev => ({ ...prev, activity }));
  }, []);

  const updateFrequency = useCallback((frequency: FrequencyFilter) => {
    setFilters(prev => ({ ...prev, frequency }));
  }, []);

  const updateCustomerType = useCallback((customerType: CustomerTypeFilter) => {
    setFilters(prev => ({ ...prev, customerType }));
  }, []);

  const updateStatus = useCallback((status: StatusFilter) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const updateSelectedTagIds = useCallback((tagIds: string[]) => {
    setFilters(prev => ({ ...prev, selectedTagIds: tagIds }));
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
    filteredCustomers,
    updateActivity,
    updateFrequency,
    updateCustomerType,
    updateStatus,
    updateSelectedTagIds,
    updateSearchQuery,
    resetFilters,
    totalCount: customers.length,
    filteredCount: filteredCustomers.length,
    isSearching, // 검색 중인지 여부
    getCurrentSearchQuery, // 하이라이트용 검색어
  };
} 