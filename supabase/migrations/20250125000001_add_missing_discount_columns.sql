-- reservations 테이블에 할인 관련 컬럼 추가
-- Phase 4-6: 적립/쿠폰 시간 사용 로직 및 DB 차감 구현

BEGIN;

-- final_price 컬럼이 없다면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' 
      AND table_schema = 'public' 
      AND column_name = 'final_price'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN final_price INTEGER DEFAULT 0;
  END IF;
END $$;

-- used_coupon_ids 컬럼이 없다면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' 
      AND table_schema = 'public' 
      AND column_name = 'used_coupon_ids'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN used_coupon_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- used_accumulated_time_minutes 컬럼이 없다면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' 
      AND table_schema = 'public' 
      AND column_name = 'used_accumulated_time_minutes'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN used_accumulated_time_minutes INTEGER DEFAULT 0;
  END IF;
END $$;

-- original_total_price 컬럼이 이미 있는지 확인하고 없다면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' 
      AND table_schema = 'public' 
      AND column_name = 'original_total_price'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN original_total_price INTEGER DEFAULT 0;
  END IF;
END $$;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.reservations.final_price IS '할인이 적용된 최종 결제 금액';
COMMENT ON COLUMN public.reservations.used_coupon_ids IS '사용된 쿠폰들의 UUID 배열';
COMMENT ON COLUMN public.reservations.used_accumulated_time_minutes IS '사용된 적립 시간 (분 단위)';
COMMENT ON COLUMN public.reservations.original_total_price IS '할인 적용 전 원래 금액';

COMMIT; 