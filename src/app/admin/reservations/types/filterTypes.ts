export type DateRangeFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export type StatusFilter = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'modified';

export interface ReservationFilters {
  dateRange: DateRangeFilter;
  startDate?: Date;
  endDate?: Date;
  status: StatusFilter;
  serviceId?: string;
  searchQuery: string;
}

export interface FilterState extends ReservationFilters {
  isFiltered: boolean;
}

export const DEFAULT_FILTERS: ReservationFilters = {
  dateRange: 'all',
  status: 'all',
  searchQuery: '',
};

export const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'confirmed', label: '예약 확정' },
  { value: 'pending', label: '예약 대기' },
  { value: 'modified', label: '예약 변경' },
  { value: 'completed', label: '이용 완료' },
  { value: 'cancelled', label: '예약 취소' },
] as const;

export const DATE_RANGE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'today', label: '오늘' },
  { value: 'this_week', label: '이번 주' },
  { value: 'this_month', label: '이번 달' },
  { value: 'custom', label: '기간 선택' },
] as const; 