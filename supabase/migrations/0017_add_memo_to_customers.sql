-- customers 테이블에 memo 필드 추가
-- 트랜잭션 시작
BEGIN;

-- 필드가 이미 존재하는지 확인 후 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND column_name = 'memo'
  ) THEN
    -- memo 필드 추가
    ALTER TABLE public.customers
    ADD COLUMN memo TEXT;
    
    RAISE NOTICE 'memo 필드가 추가되었습니다.';
  ELSE
    RAISE NOTICE 'memo 필드가 이미 존재합니다.';
  END IF;
END $$;

-- 예시 설명 코멘트 추가
COMMENT ON COLUMN public.customers.memo IS '고객에 대한 관리자 메모';

-- 커밋
COMMIT; 