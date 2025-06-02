export type SortDirection = 'asc' | 'desc';

export interface SortField {
  column: string;
  direction: SortDirection;
}

export interface SortState {
  fields: SortField[];
}

export type SortableColumn = 
  | 'id'
  | 'customer_name' 
  | 'service_name'
  | 'reservation_time'
  | 'status'
  | 'created_at';

export const SORTABLE_COLUMNS: Record<SortableColumn, string> = {
  id: 'ID',
  customer_name: '고객',
  service_name: '서비스',
  reservation_time: '예약 시간',
  status: '상태', 
  created_at: '예약일',
};

export const DEFAULT_SORT_STATE: SortState = {
  fields: [
    { column: 'reservation_time', direction: 'desc' }
  ]
}; 