// Phase 2: 고객 관리 테이블 개선 - 고객 필터링 타입 정의

export type ActivityFilter = 'all' | 'recent_week' | 'recent_month' | 'recent_3months' | 'recent_6months' | 'no_visit';
export type FrequencyFilter = 'all' | 'new_customer' | 'returning_customer' | 'regular_customer';
export type CustomerTypeFilter = 'all' | 'general' | 'vip' | 'business';
export type StatusFilter = 'all' | 'active' | 'inactive';

export interface CustomerFilters {
  searchQuery: string;
  activity: ActivityFilter;
  frequency: FrequencyFilter;
  customerType: CustomerTypeFilter;
  status: StatusFilter;
  selectedTagIds: string[];
}

export interface FilterState extends CustomerFilters {
  isFiltered: boolean;
}

export const DEFAULT_FILTERS: CustomerFilters = {
  searchQuery: '',
  activity: 'all',
  frequency: 'all',
  customerType: 'all',
  status: 'all',
  selectedTagIds: [],
};

// 필터 옵션 정의
export const ACTIVITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'recent_week', label: '최근 1주일 방문' },
  { value: 'recent_month', label: '최근 1개월 방문' },
  { value: 'recent_3months', label: '최근 3개월 방문' },
  { value: 'recent_6months', label: '최근 6개월+ 방문' },
  { value: 'no_visit', label: '방문 기록 없음' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'new_customer', label: '신규고객 (1회)' },
  { value: 'returning_customer', label: '재방문고객 (2-5회)' },
  { value: 'regular_customer', label: '단골고객 (6회+)' },
] as const;

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'general', label: '일반고객' },
  { value: 'vip', label: 'VIP고객' },
  { value: 'business', label: '기업고객' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' },
] as const; 