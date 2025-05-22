-- 관리자 권한 확인을 위한 함수 추가
BEGIN;

-- 사용자가 관리자인지 확인하는 함수
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 현재 인증된 사용자의 역할 조회
  SELECT role INTO user_role
  FROM public.customers
  WHERE id = auth.uid();
  
  -- 역할이 'admin'인 경우 true 반환
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 특정 사용자의 역할을 반환하는 함수
CREATE OR REPLACE FUNCTION public.get_customer_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 지정된 사용자의 역할 조회
  SELECT role INTO user_role
  FROM public.customers
  WHERE id = user_id;
  
  -- 역할 반환
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 함수에 대한 실행 권한 설정
GRANT EXECUTE ON FUNCTION public.check_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_role(UUID) TO authenticated;

COMMIT; 