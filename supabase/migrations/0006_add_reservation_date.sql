-- reservations 테이블에 reservation_date 필드 추가
-- 테이블이 존재하는 경우에만 수정하는 idempotent 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 먼저 컬럼이 존재하는지 확인하고 없는 경우에만 추가
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'reservation_date'
    ) THEN
        -- reservation_date 컬럼 추가 (DATE 타입)
        ALTER TABLE public.reservations ADD COLUMN reservation_date DATE;

        -- 기존 데이터 업데이트 (start_time에서 추출)
        UPDATE public.reservations
        SET reservation_date = (start_time AT TIME ZONE 'Asia/Seoul')::DATE;

        -- 이제 NOT NULL 제약 조건 추가
        ALTER TABLE public.reservations ALTER COLUMN reservation_date SET NOT NULL;

        -- 인덱스 추가
        CREATE INDEX IF NOT EXISTS reservations_reservation_date_idx ON public.reservations(reservation_date);
    END IF;
END $$;

-- start_time, end_time 컬럼 타입 변경 (TIMESTAMP WITH TIME ZONE -> TEXT)
DO $$
BEGIN
    -- 컬럼 타입 확인
    IF EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reservations'
        AND column_name = 'start_time'
        AND data_type = 'timestamp with time zone'
    ) THEN
        -- 임시 컬럼 추가
        ALTER TABLE public.reservations 
        ADD COLUMN start_time_text TEXT,
        ADD COLUMN end_time_text TEXT;

        -- 데이터 변환 (HH:MM 형식으로)
        UPDATE public.reservations
        SET 
            start_time_text = TO_CHAR((start_time AT TIME ZONE 'Asia/Seoul'), 'HH24:MI'),
            end_time_text = TO_CHAR((end_time AT TIME ZONE 'Asia/Seoul'), 'HH24:MI');

        -- 기존 컬럼 삭제
        ALTER TABLE public.reservations 
        DROP COLUMN start_time,
        DROP COLUMN end_time;

        -- 임시 컬럼 이름 변경
        ALTER TABLE public.reservations 
        RENAME COLUMN start_time_text TO start_time;
        
        ALTER TABLE public.reservations 
        RENAME COLUMN end_time_text TO end_time;

        -- NOT NULL 제약 조건 추가
        ALTER TABLE public.reservations 
        ALTER COLUMN start_time SET NOT NULL,
        ALTER COLUMN end_time SET NOT NULL;
    END IF;
END $$;

-- 커밋
COMMIT; 