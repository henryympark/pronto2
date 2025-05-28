-- PostgreSQL 함수 수정: reservation_date 컬럼 누락 문제 해결
-- Phase 4-6: 적립/쿠폰 시간 사용 로직 및 DB 차감 구현

BEGIN;

-- 함수를 수정하여 reservation_date 컬럼을 INSERT에 포함
CREATE OR REPLACE FUNCTION public.create_reservation_with_discount(
  p_service_id UUID,
  p_customer_id UUID,
  p_reservation_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_total_hours DECIMAL,
  p_total_price INTEGER,
  p_final_price INTEGER,
  p_customer_name TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_shooting_purpose TEXT DEFAULT NULL,
  p_vehicle_number TEXT DEFAULT NULL,
  p_privacy_agreed BOOLEAN DEFAULT TRUE,
  p_used_coupon_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_used_accumulated_minutes INTEGER DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id UUID;
  v_coupon_id UUID;
  v_customer_accumulated_minutes INTEGER;
  v_used_coupon_minutes INTEGER := 0;
  v_total_discount_minutes INTEGER := 0;
  v_result jsonb;
  v_start_timestamp TIMESTAMP WITH TIME ZONE;
  v_end_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. 입력 검증
  IF p_customer_id IS NULL OR p_service_id IS NULL THEN
    RAISE EXCEPTION 'customer_id and service_id are required';
  END IF;

  IF p_used_accumulated_minutes < 0 THEN
    RAISE EXCEPTION 'used_accumulated_minutes must be non-negative';
  END IF;

  -- 2. DATE와 TIME을 TIMESTAMP WITH TIME ZONE으로 변환
  v_start_timestamp := (p_reservation_date + p_start_time) AT TIME ZONE 'Asia/Seoul';
  v_end_timestamp := (p_reservation_date + p_end_time) AT TIME ZONE 'Asia/Seoul';

  -- 3. 고객의 현재 적립 시간 확인
  SELECT accumulated_time_minutes 
  INTO v_customer_accumulated_minutes
  FROM public.customers 
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- 4. 적립 시간 차감 검증
  IF p_used_accumulated_minutes > v_customer_accumulated_minutes THEN
    RAISE EXCEPTION 'Insufficient accumulated time. Available: % minutes, Requested: % minutes', 
      v_customer_accumulated_minutes, p_used_accumulated_minutes;
  END IF;

  -- 5. 쿠폰 검증 및 사용 가능한 시간 계산
  IF array_length(p_used_coupon_ids, 1) > 0 THEN
    FOR v_coupon_id IN SELECT unnest(p_used_coupon_ids)
    LOOP
      -- 쿠폰 유효성 검증
      IF NOT EXISTS (
        SELECT 1 FROM public.customer_coupons 
        WHERE id = v_coupon_id 
          AND customer_id = p_customer_id 
          AND is_used = FALSE
          AND (expires_at IS NULL OR expires_at > NOW())
      ) THEN
        RAISE EXCEPTION 'Invalid or already used coupon: %', v_coupon_id;
      END IF;

      -- 쿠폰 시간 합계 계산
      SELECT COALESCE(v_used_coupon_minutes, 0) + minutes
      INTO v_used_coupon_minutes
      FROM public.customer_coupons
      WHERE id = v_coupon_id;
    END LOOP;
  END IF;

  -- 6. 총 할인 시간 계산
  v_total_discount_minutes := v_used_coupon_minutes + p_used_accumulated_minutes;

  -- 7. 예약 생성 (reservation_date 컬럼 추가)
  INSERT INTO public.reservations (
    service_id,
    customer_id,
    reservation_date,
    start_time,
    end_time,
    total_hours,
    total_price,
    final_price,
    original_total_price,
    status,
    customer_name,
    company_name,
    shooting_purpose,
    vehicle_number,
    privacy_agreed,
    used_coupon_ids,
    used_accumulated_time_minutes,
    created_at,
    updated_at
  ) VALUES (
    p_service_id,
    p_customer_id,
    p_reservation_date,
    v_start_timestamp,
    v_end_timestamp,
    p_total_hours,
    p_final_price,
    p_final_price,
    p_total_price,
    'confirmed',
    p_customer_name,
    p_company_name,
    p_shooting_purpose,
    p_vehicle_number,
    p_privacy_agreed,
    p_used_coupon_ids,
    p_used_accumulated_minutes,
    NOW(),
    NOW()
  ) RETURNING id INTO v_reservation_id;

  -- 8. 사용된 쿠폰들을 '사용됨' 상태로 업데이트
  IF array_length(p_used_coupon_ids, 1) > 0 THEN
    UPDATE public.customer_coupons 
    SET 
      is_used = TRUE,
      used_at = NOW(),
      used_reservation_id = v_reservation_id,
      updated_at = NOW()
    WHERE id = ANY(p_used_coupon_ids)
      AND customer_id = p_customer_id
      AND is_used = FALSE;

    -- 업데이트된 쿠폰 수 확인
    IF (SELECT COUNT(*) FROM public.customer_coupons WHERE id = ANY(p_used_coupon_ids) AND is_used = TRUE) 
       != array_length(p_used_coupon_ids, 1) THEN
      RAISE EXCEPTION 'Failed to update all coupons';
    END IF;
  END IF;

  -- 9. 적립 시간 차감
  IF p_used_accumulated_minutes > 0 THEN
    UPDATE public.customers 
    SET 
      accumulated_time_minutes = accumulated_time_minutes - p_used_accumulated_minutes,
      updated_at = NOW()
    WHERE id = p_customer_id;

    -- 업데이트 확인
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update customer accumulated time';
    END IF;
  END IF;

  -- 10. 결과 반환
  v_result := jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'final_price', p_final_price,
    'original_price', p_total_price,
    'total_discount_minutes', v_total_discount_minutes,
    'used_coupon_count', COALESCE(array_length(p_used_coupon_ids, 1), 0),
    'used_accumulated_minutes', p_used_accumulated_minutes,
    'created_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 롤백 (트랜잭션 자동 롤백)
    RAISE EXCEPTION 'Reservation creation failed: %', SQLERRM;
END;
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION public.create_reservation_with_discount TO authenticated;

-- 함수 설명 업데이트
COMMENT ON FUNCTION public.create_reservation_with_discount IS 
'예약 생성과 적립/쿠폰 차감을 트랜잭션으로 처리하는 함수. reservation_date 컬럼 포함하도록 수정.';

COMMIT; 