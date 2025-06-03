-- Add accumulated time RPC function

BEGIN;

-- add_accumulated_time 함수 생성
CREATE OR REPLACE FUNCTION public.add_accumulated_time(
  customer_id UUID,
  minutes_to_add INTEGER
) 
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- customer_id가 유효한지 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.customers 
    WHERE id = customer_id
  ) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- 적립 시간 업데이트
  UPDATE public.customers
  SET 
    accumulated_time_minutes = COALESCE(accumulated_time_minutes, 0) + minutes_to_add,
    updated_at = NOW()
  WHERE id = customer_id;

  -- 업데이트된 행이 없으면 에러
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update customer accumulated time';
  END IF;
END;
$$;

-- 함수에 대한 설명 추가
COMMENT ON FUNCTION public.add_accumulated_time(UUID, INTEGER) IS '고객의 적립 시간을 추가하는 함수';

-- 필요한 권한 부여 (관리자만 실행 가능하도록)
REVOKE ALL ON FUNCTION public.add_accumulated_time(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_accumulated_time(UUID, INTEGER) TO authenticated;

COMMIT; 