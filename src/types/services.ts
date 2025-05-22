/**
 * 서비스 데이터 타입 정의
 */
export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_per_hour: number;
  location: string | null;
  image_url: string | null;
  notice: string | null;
  refund_policy: string | null;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}; 