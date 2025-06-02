import { useState, useMemo, useCallback } from 'react';
import { SortField, SortState, SortDirection, SortableColumn, DEFAULT_SORT_STATE } from '../types/sortTypes';
import { Reservation } from '../utils/reservationTypes';
import { parseISO } from 'date-fns';

export function useReservationSort(reservations: Reservation[]) {
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);

  // 정렬된 예약 목록 계산
  const sortedReservations = useMemo(() => {
    if (sortState.fields.length === 0) {
      return reservations;
    }

    return [...reservations].sort((a, b) => {
      for (const sortField of sortState.fields) {
        const { column, direction } = sortField;
        let aValue: any;
        let bValue: any;

        // 컬럼별 값 추출
        switch (column) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'customer_name':
            aValue = a.customers?.nickname || a.customers?.email || '';
            bValue = b.customers?.nickname || b.customers?.email || '';
            break;
          case 'service_name':
            aValue = a.services?.name || '';
            bValue = b.services?.name || '';
            break;
          case 'reservation_time':
            // 예약 날짜와 시간을 조합하여 정렬
            const aDate = a.reservation_date && a.start_time 
              ? parseISO(`${a.reservation_date}T${a.start_time}`)
              : new Date(0);
            const bDate = b.reservation_date && b.start_time
              ? parseISO(`${b.reservation_date}T${b.start_time}`)
              : new Date(0);
            aValue = aDate.getTime();
            bValue = bDate.getTime();
            break;
          case 'status':
            // 상태 우선순위: confirmed > pending > cancelled
            const statusOrder = { confirmed: 2, pending: 1, cancelled: 0 };
            aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
            bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
            break;
          case 'created_at':
            aValue = a.created_at ? parseISO(a.created_at).getTime() : 0;
            bValue = b.created_at ? parseISO(b.created_at).getTime() : 0;
            break;
          default:
            continue;
        }

        // 값 비교
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          // 기타 타입은 문자열로 변환하여 비교
          comparison = String(aValue).localeCompare(String(bValue));
        }

        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [reservations, sortState]);

  // 정렬 상태 업데이트
  const updateSort = useCallback((column: SortableColumn, isShiftPressed: boolean = false) => {
    setSortState(prevState => {
      // Shift+클릭이 아닌 경우, 단일 정렬
      if (!isShiftPressed) {
        const existingField = prevState.fields.find(field => field.column === column);
        
        if (existingField) {
          // 같은 컬럼이면 방향 토글
          const newDirection: SortDirection = existingField.direction === 'asc' ? 'desc' : 'asc';
          return {
            fields: [{ column, direction: newDirection }]
          };
        } else {
          // 새로운 컬럼이면 오름차순으로 시작
          return {
            fields: [{ column, direction: 'asc' }]
          };
        }
      }

      // Shift+클릭인 경우, 다중 정렬
      const existingFieldIndex = prevState.fields.findIndex(field => field.column === column);
      
      if (existingFieldIndex >= 0) {
        // 기존 필드가 있으면 방향 토글
        const updatedFields = [...prevState.fields];
        updatedFields[existingFieldIndex] = {
          ...updatedFields[existingFieldIndex],
          direction: updatedFields[existingFieldIndex].direction === 'asc' ? 'desc' : 'asc'
        };
        return { fields: updatedFields };
      } else {
        // 새로운 필드 추가
        return {
          fields: [...prevState.fields, { column, direction: 'asc' }]
        };
      }
    });
  }, []);

  // 정렬 초기화
  const resetSort = useCallback(() => {
    setSortState(DEFAULT_SORT_STATE);
  }, []);

  // 특정 컬럼의 정렬 상태 가져오기
  const getSortState = useCallback((column: SortableColumn) => {
    const field = sortState.fields.find(field => field.column === column);
    if (!field) return null;
    
    const index = sortState.fields.findIndex(field => field.column === column);
    return {
      direction: field.direction,
      order: index + 1, // 정렬 순서 (1부터 시작)
      isMultiSort: sortState.fields.length > 1
    };
  }, [sortState]);

  // 정렬이 적용되어 있는지 확인
  const isSorted = useMemo(() => {
    return sortState.fields.length > 0 && 
           !(sortState.fields.length === 1 && 
             sortState.fields[0].column === 'reservation_time' && 
             sortState.fields[0].direction === 'desc');
  }, [sortState]);

  return {
    sortedReservations,
    sortState,
    updateSort,
    resetSort,
    getSortState,
    isSorted,
  };
} 