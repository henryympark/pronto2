export type Customer = {
  id: string;
  email?: string;
  nickname?: string;
  phone?: string;
};

export type Service = {
  id: string;
  name: string;
  price_per_hour: number;
};

export type ReservationStatus = 
  | 'pending'
  | 'confirmed'
  | 'modified'
  | 'completed'
  | 'cancelled';

export type ReservationTimeStatus = 
  | 'before_start'
  | 'in_progress'
  | 'completed'
  | 'unknown';

export type Reservation = {
  id: string;
  service_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string;
  company_name?: string;
  shooting_purpose?: string;
  vehicle_number?: string;
  admin_memo?: string;
  created_at: string;
  reservation_date?: string;
  total_price?: number;
  final_price?: number;
  privacy_agreed?: boolean;
  // 타임스탬프 조합 필드 (런타임 생성)
  combined_start_time?: string;
  combined_end_time?: string;
  customers: Customer;
  services?: Service;
};

export type TimeRange = {
  start: string;
  end: string;
  duration: number;
  price: number;
}; 