'use client';

import { useState, useMemo } from 'react';

export interface AdminTableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AdminTablePagination {
  current: number;
  pageSize: number;
  total: number;
}

interface UseAdminTableProps<T> {
  data: T[];
  initialSort?: AdminTableSort;
  initialPageSize?: number;
}

export function useAdminTable<T = any>({ 
  data, 
  initialSort,
  initialPageSize = 10 
}: UseAdminTableProps<T>) {
  const [sort, setSort] = useState<AdminTableSort | null>(initialSort || null);
  const [pagination, setPagination] = useState<AdminTablePagination>({
    current: 1,
    pageSize: initialPageSize,
    total: data.length
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sort) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sort.field];
      const bValue = (b as any)[sort.field];

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, pagination]);

  // 정렬 핸들러
  const handleSort = (field: string) => {
    setSort(prevSort => {
      if (!prevSort || prevSort.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prevSort.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return null; // 정렬 해제
    });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize, 
      current: 1 // 첫 페이지로 리셋
    }));
  };

  // 선택 관련 핸들러
  const handleSelectRow = (rowKey: string) => {
    setSelectedRowKeys(prev => 
      prev.includes(rowKey) 
        ? prev.filter(key => key !== rowKey)
        : [...prev, rowKey]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 현재 페이지의 모든 행 선택
      const currentPageKeys = paginatedData.map((item, index) => String((item as any).id || index));
      setSelectedRowKeys(currentPageKeys);
    } else {
      setSelectedRowKeys([]);
    }
  };

  // 총 개수 업데이트
  const updatedPagination = useMemo(() => ({
    ...pagination,
    total: data.length
  }), [pagination, data.length]);

  return {
    // 데이터
    data: paginatedData,
    allData: sortedData,
    
    // 상태
    sort,
    pagination: updatedPagination,
    selectedRowKeys,
    
    // 핸들러
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleSelectRow,
    handleSelectAll,
    
    // 유틸리티
    isSelected: (rowKey: string) => selectedRowKeys.includes(rowKey),
    isAllSelected: selectedRowKeys.length === paginatedData.length && paginatedData.length > 0,
    selectedCount: selectedRowKeys.length,
    totalCount: data.length
  };
} 