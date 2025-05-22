-- customers 테이블에 적립 시간 필드 추가 마이그레이션

BEGIN;

-- 컬럼이 이미 존재하는지 확인 (안전한 마이그레이션을 위해)
DO $$
BEGIN
  -- accumulated_time_minutes 컬럼이 없는 경우에만 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND column_name = 'accumulated_time_minutes'
  ) THEN
    -- 적립 시간 필드 추가 (기본값 0분)
    ALTER TABLE public.customers 
    ADD COLUMN accumulated_time_minutes INTEGER NOT NULL DEFAULT 0;
    
    -- 설명 추가
    COMMENT ON COLUMN public.customers.accumulated_time_minutes IS '적립된 시간 (분 단위)';
  END IF;
END
$$;

-- 기존 고객들의 적립 시간 초기화 (선택 사항)
UPDATE public.customers
SET accumulated_time_minutes = 0
WHERE accumulated_time_minutes IS NULL;

-- 인덱스 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'customers'
    AND indexname = 'idx_customers_accumulated_time'
  ) THEN
    CREATE INDEX idx_customers_accumulated_time ON public.customers(accumulated_time_minutes);
  END IF;
END
$$;

COMMIT; 