-- 사용자 생성 시 고객 데이터 자동 추가를 위한 트리거 설정
BEGIN;

-- 트리거 함수가 이미 있다면 재사용, 없으면 새로 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'customer',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 이미 존재하는지 확인하고 없으면 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 기존 사용자를 customers 테이블에 동기화
SELECT sync_missing_customers();

-- 오류 처리 개선을 위한 함수 수정
CREATE OR REPLACE FUNCTION public.get_user_reservations(user_id UUID)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 먼저 사용자가 customers 테이블에 있는지 확인
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = user_id) THEN
    -- 없으면 자동으로 추가 시도
    BEGIN
      INSERT INTO public.customers (id, email, name, role, created_at, updated_at)
      SELECT 
        id, 
        email, 
        COALESCE(raw_user_meta_data->>'name', email),
        'customer',
        NOW(),
        NOW()
      FROM auth.users
      WHERE id = user_id
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- 오류 발생 시 빈 결과 반환
      RETURN;
    END;
  END IF;

  -- 예약 정보 조회
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', r.id,
    'service_id', r.service_id,
    'customer_id', r.customer_id,
    'reservation_date', r.reservation_date,
    'start_time', r.start_time,
    'end_time', r.end_time,
    'total_hours', r.total_hours,
    'total_price', r.total_price,
    'status', r.status,
    'customer_name', r.customer_name,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'original_total_price', r.original_total_price,
    'recalculated_total_amount', r.recalculated_total_amount,
    'pending_payment_amount', r.pending_payment_amount,
    'pending_refund_amount', r.pending_refund_amount,
    'has_review', r.has_review,
    'company_name', r.company_name,
    'shooting_purpose', r.shooting_purpose,
    'vehicle_number', r.vehicle_number,
    'service_details', jsonb_build_object(
      'id', s.id,
      'name', s.name
    )
  )
  FROM public.reservations r
  LEFT JOIN public.services s ON r.service_id = s.id
  WHERE r.customer_id = user_id
  ORDER BY r.reservation_date DESC;
EXCEPTION WHEN OTHERS THEN
  -- 모든 예외 상황에서 빈 결과 반환
  RETURN;
END;
$$;

COMMIT; 