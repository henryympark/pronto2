-- Create reservations table
-- 테이블이 없을 경우에만 생성하는 idempotent한 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 테이블이 없을 경우에만 생성
CREATE TABLE IF NOT EXISTS public.reservations (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 예약 관계 정보
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 예약 시간 정보
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- 예약 상태 및 추가 정보
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, modified, cancelled
  customer_name TEXT NOT NULL,
  company_name TEXT,
  shooting_purpose TEXT,
  vehicle_number TEXT,
  admin_memo TEXT,
  
  -- 결제 정보 (Phase 5에서 구현)
  payment_id TEXT,
  payment_amount INTEGER,
  
  -- 사용한 적립/쿠폰 정보
  used_accumulated_time_minutes INTEGER DEFAULT 0,
  used_coupon_ids UUID[] DEFAULT '{}',
  
  -- 개인정보 동의
  privacy_agreed BOOLEAN DEFAULT false,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS reservations_service_id_idx ON public.reservations(service_id);
CREATE INDEX IF NOT EXISTS reservations_customer_id_idx ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS reservations_start_time_idx ON public.reservations(start_time);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON public.reservations(status);

-- updated_at 자동 갱신을 위한 트리거 생성
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservations_updated_at ON public.reservations;
CREATE TRIGGER reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE PROCEDURE update_reservations_updated_at();

-- 예약 시간 중복 체크 함수
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
DECLARE
  count INTEGER;
BEGIN
  -- 같은 서비스에 대해 예약 시간이 겹치는지 확인
  -- cancelled 상태가 아닌 예약만 확인
  SELECT COUNT(*) INTO count
  FROM public.reservations
  WHERE 
    service_id = NEW.service_id AND
    status != 'cancelled' AND
    id != NEW.id AND
    (
      (NEW.start_time < end_time AND NEW.end_time > start_time) OR
      (NEW.start_time = start_time) OR
      (NEW.end_time = end_time)
    );
    
  IF count > 0 THEN
    RAISE EXCEPTION '예약 시간이 겹칩니다.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_reservation_overlap_trigger ON public.reservations;
CREATE TRIGGER check_reservation_overlap_trigger
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE PROCEDURE check_reservation_overlap();

-- RLS 정책 설정 (Row Level Security)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 예약만 볼 수 있음
CREATE POLICY "Users can view their own reservations" 
ON public.reservations FOR SELECT 
USING (auth.uid() = customer_id);

-- 관리자는 모든 예약을 볼 수 있음
CREATE POLICY "Admins can view all reservations" 
ON public.reservations FOR SELECT 
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 사용자는 본인의 예약만 생성/수정/삭제 가능
CREATE POLICY "Users can create their own reservations" 
ON public.reservations FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own reservations" 
ON public.reservations FOR UPDATE 
USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own reservations" 
ON public.reservations FOR DELETE 
USING (auth.uid() = customer_id);

-- 관리자는 모든 예약을 생성/수정/삭제 가능
CREATE POLICY "Admins can manage all reservations" 
ON public.reservations FOR ALL 
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 커밋
COMMIT; 