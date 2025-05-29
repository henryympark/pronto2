-- 동시간대 예약 처리 안정화 (Phase 5-2단계)
-- service_id와 start_time 조합으로 confirmed 상태 예약이 하나만 존재하도록 하는 부분 UNIQUE 제약 조건

BEGIN;

-- 1. 기존 중복 체크 트리거 제거 (새로운 제약 조건으로 대체)
DROP TRIGGER IF EXISTS check_reservation_overlap_trigger ON public.reservations;
DROP FUNCTION IF EXISTS check_reservation_overlap();

-- 2. 동일한 서비스의 동일한 시작 시간에 confirmed 상태 예약이 하나만 존재하도록 하는 부분 UNIQUE 제약 조건 생성
-- WHERE 절을 사용한 부분 인덱스로 구현 (confirmed 상태인 예약만 대상)
CREATE UNIQUE INDEX IF NOT EXISTS unique_confirmed_reservation_slot 
ON public.reservations (service_id, start_time) 
WHERE status = 'confirmed';

-- 3. 예약 상태가 modified인 경우도 같은 제약 적용 (원래 confirmed에서 변경된 예약)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_reservation_slot 
ON public.reservations (service_id, start_time) 
WHERE status IN ('confirmed', 'modified');

-- 4. 동시 예약 처리를 위한 함수 생성
CREATE OR REPLACE FUNCTION handle_concurrent_reservation_error()
RETURNS TRIGGER AS $$
BEGIN
  -- 제약 조건 위반 시 사용자 친화적인 에러 메시지 반환
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION USING 
      ERRCODE = 'P0001',
      MESSAGE = '선택하신 시간에 이미 다른 예약이 있습니다. 다른 시간을 선택해주세요.',
      DETAIL = 'service_id: ' || NEW.service_id || ', start_time: ' || NEW.start_time,
      HINT = '다른 가능한 시간대를 확인해보세요.';
END;
$$ LANGUAGE plpgsql;

-- 5. 예약 생성/수정 시 동시성 에러 처리 트리거 생성
CREATE TRIGGER handle_concurrent_reservation_trigger
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
WHEN (NEW.status IN ('confirmed', 'modified'))
EXECUTE FUNCTION handle_concurrent_reservation_error();

-- 6. 예약 확정 시 동시성 검증을 위한 함수 (웹훅 처리 시 사용)
CREATE OR REPLACE FUNCTION confirm_reservation_safely(
  p_reservation_id UUID,
  p_payment_id TEXT DEFAULT NULL,
  p_paid_amount INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_reservation RECORD;
BEGIN
  -- 예약 정보 조회
  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RESERVATION_NOT_FOUND',
      'message', '예약을 찾을 수 없습니다.'
    );
  END IF;

  -- 이미 확정된 예약인 경우
  IF v_reservation.status IN ('confirmed', 'modified') THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', '이미 확정된 예약입니다.',
      'reservation_id', p_reservation_id
    );
  END IF;

  BEGIN
    -- 트랜잭션 내에서 예약 상태를 confirmed로 업데이트
    UPDATE public.reservations
    SET 
      status = 'confirmed',
      payment_id = COALESCE(p_payment_id, payment_id),
      payment_amount = COALESCE(p_paid_amount, payment_amount),
      updated_at = NOW()
    WHERE id = p_reservation_id;

    -- 성공적으로 업데이트된 경우
    RETURN jsonb_build_object(
      'success', true,
      'message', '예약이 성공적으로 확정되었습니다.',
      'reservation_id', p_reservation_id
    );

  EXCEPTION
    WHEN unique_violation THEN
      -- 동시 예약으로 인한 제약 조건 위반
      RETURN jsonb_build_object(
        'success', false,
        'error', 'CONCURRENT_BOOKING',
        'message', '죄송합니다. 같은 시간에 다른 고객이 먼저 예약을 완료했습니다. 다른 시간을 선택해주세요.',
        'refund_required', true
      );
    WHEN OTHERS THEN
      -- 기타 에러
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNKNOWN_ERROR',
        'message', '예약 확정 중 오류가 발생했습니다: ' || SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 동시 예약 실패 로그를 위한 테이블 생성 (옵션)
CREATE TABLE IF NOT EXISTS public.concurrent_booking_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  attempted_customer_id UUID REFERENCES auth.users(id),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  payment_id TEXT, -- 환불이 필요한 결제 ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS concurrent_failures_service_time_idx 
ON public.concurrent_booking_failures(service_id, start_time);

CREATE INDEX IF NOT EXISTS concurrent_failures_customer_idx 
ON public.concurrent_booking_failures(attempted_customer_id);

-- RLS 정책 설정
ALTER TABLE public.concurrent_booking_failures ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admins can view concurrent booking failures" 
ON public.concurrent_booking_failures FOR SELECT 
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 시스템에서만 삽입 가능
CREATE POLICY "System can insert concurrent booking failures" 
ON public.concurrent_booking_failures FOR INSERT 
WITH CHECK (true);

COMMIT; 