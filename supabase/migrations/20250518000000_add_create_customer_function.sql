-- 새 고객 생성 함수 추가
BEGIN;

-- 새 고객을 생성하는 RPC 함수
CREATE OR REPLACE FUNCTION public.create_new_customer(
  customer_id UUID,
  customer_email TEXT,
  customer_provider TEXT DEFAULT 'email',
  customer_role TEXT DEFAULT 'customer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- 이미 고객이 존재하는지 확인
  IF EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id) THEN
    -- 이미 존재하면 업데이트만 수행
    UPDATE public.customers
    SET 
      email = customer_email,
      auth_provider = customer_provider,
      updated_at = now()
    WHERE id = customer_id;
  ELSE
    -- 새 고객 레코드 생성
    INSERT INTO public.customers (
      id,
      email,
      auth_provider,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      customer_id,
      customer_email,
      customer_provider,
      customer_role,
      true,
      now(),
      now()
    );
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'create_new_customer 함수 오류: %', SQLERRM;
    RETURN false;
END;
$$;

-- 함수에 대한 실행 권한 설정
GRANT EXECUTE ON FUNCTION public.create_new_customer(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMIT; 