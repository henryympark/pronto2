'use client';

import { useState, useMemo } from 'react';

export interface AdminFilters {
  search?: string;
  status?: string;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  category?: string;
  [key: string]: any;
}

interface UseAdminFiltersProps<T> {
  data: T[];
  searchFields?: (keyof T)[];
  filterFunctions?: {
    [key: string]: (item: T, value: any) => boolean;
  };
}

export function useAdminFilters<T = any>({
  data,
  searchFields = [],
  filterFunctions = {}
}: UseAdminFiltersProps<T>) {
  const [filters, setFilters] = useState<AdminFilters>({});

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 검색 필터
      if (filters.search && searchFields.length > 0) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = searchFields.some(field => {
          const value = item[field];
          return String(value || '').toLowerCase().includes(searchTerm);
        });
        if (!matchesSearch) return false;
      }

      // 상태 필터
      if (filters.status && filters.status !== 'all') {
        if (filterFunctions.status) {
          if (!filterFunctions.status(item, filters.status)) return false;
        } else {
          const status = (item as any).status;
          if (status !== filters.status) return false;
        }
      }

      // 날짜 범위 필터
      if (filters.dateRange?.from || filters.dateRange?.to) {
        if (filterFunctions.dateRange) {
          if (!filterFunctions.dateRange(item, filters.dateRange)) return false;
        } else {
          const itemDate = new Date((item as any).created_at || (item as any).date);
          if (filters.dateRange.from && itemDate < filters.dateRange.from) return false;
          if (filters.dateRange.to && itemDate > filters.dateRange.to) return false;
        }
      }

      // 카테고리 필터
      if (filters.category && filters.category !== 'all') {
        if (filterFunctions.category) {
          if (!filterFunctions.category(item, filters.category)) return false;
        } else {
          const category = (item as any).category;
          if (category !== filters.category) return false;
        }
      }

      // 커스텀 필터들
      for (const [key, value] of Object.entries(filters)) {
        if (['search', 'status', 'dateRange', 'category'].includes(key)) continue;
        if (value === undefined || value === null || value === '' || value === 'all') continue;
        
        if (filterFunctions[key]) {
          if (!filterFunctions[key](item, value)) return false;
        }
      }

      return true;
    });
  }, [data, filters, searchFields, filterFunctions]);

  // 필터 업데이트 핸들러들
  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSearch = (search: string) => {
    updateFilter('search', search);
  };

  const updateStatus = (status: string) => {
    updateFilter('status', status);
  };

  const updateDateRange = (dateRange: { from: Date | null; to: Date | null }) => {
    updateFilter('dateRange', dateRange);
  };

  const updateCategory = (category: string) => {
    updateFilter('category', category);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  // 필터 상태 유틸리티
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') return false;
      if (key === 'dateRange') {
        const range = value as { from: Date | null; to: Date | null };
        return range.from !== null || range.to !== null;
      }
      return true;
    });
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') return false;
      if (key === 'dateRange') {
        const range = value as { from: Date | null; to: Date | null };
        return range.from !== null || range.to !== null;
      }
      return true;
    }).length;
  }, [filters]);

  return {
    // 데이터
    data: filteredData,
    originalData: data,
    
    // 필터 상태
    filters,
    hasActiveFilters,
    activeFilterCount,
    
    // 업데이트 핸들러
    updateFilter,
    updateSearch,
    updateStatus,
    updateDateRange,
    updateCategory,
    clearFilters,
    clearFilter,
    
    // 유틸리티
    resultCount: filteredData.length,
    totalCount: data.length,
    isFiltered: filteredData.length !== data.length
  };
} 