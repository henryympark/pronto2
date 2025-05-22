-- Add price change tracking fields to reservations table
-- 테이블이 존재하는 경우에만 수정하는 idempotent 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 필요한 컬럼들이 존재하는지 확인하고 없는 경우에만 추가
DO $$
BEGIN
    -- recalculated_total_amount 컬럼 추가
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'recalculated_total_amount'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN recalculated_total_amount INTEGER;
    END IF;

    -- pending_payment_amount 컬럼 추가 (추가 결제 필요 금액)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'pending_payment_amount'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN pending_payment_amount INTEGER DEFAULT 0;
    END IF;

    -- pending_refund_amount 컬럼 추가 (환불 예정 금액)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'pending_refund_amount'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN pending_refund_amount INTEGER DEFAULT 0;
    END IF;

    -- original_total_price 컬럼 추가 (최초 예약 시 총 금액)
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'original_total_price'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN original_total_price INTEGER;
        
        -- 기존 데이터 업데이트
        UPDATE public.reservations
        SET original_total_price = total_price
        WHERE original_total_price IS NULL;
    END IF;
END $$;

-- 커밋
COMMIT; 