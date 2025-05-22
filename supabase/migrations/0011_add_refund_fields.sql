-- Add refund related fields to reservations table
-- 테이블이 존재하는 경우에만 수정하는 idempotent 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 필요한 컬럼들이 존재하는지 확인하고 없는 경우에만 추가
DO $$
BEGIN
    -- paid_amount 컬럼 추가 (실제 결제된 금액)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'paid_amount'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN paid_amount INTEGER DEFAULT 0;
    END IF;

    -- refunded 컬럼 추가 (환불 여부)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'refunded'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN refunded BOOLEAN DEFAULT false;
    END IF;

    -- refunded_at 컬럼 추가 (환불 처리 일시)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'refunded_at'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- total_hours 컬럼 추가 (총 이용 시간)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'total_hours'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN total_hours INTEGER;
        
        -- 기존 데이터 업데이트 (시간 차이 계산)
        UPDATE public.reservations
        SET total_hours = 
            CASE 
                WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
                    EXTRACT(HOUR FROM (end_time::time - start_time::time)) + 
                    EXTRACT(MINUTE FROM (end_time::time - start_time::time)) / 60
                ELSE NULL
            END;
    END IF;

    -- total_price 컬럼 추가 (총 가격)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'total_price'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN total_price INTEGER DEFAULT 0;
    END IF;
END $$;

-- 커밋
COMMIT; 