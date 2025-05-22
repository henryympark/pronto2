-- 자동 관리자 지정 로직 제거
BEGIN;

-- 이전 마이그레이션에서 추가한 함수 삭제 (불필요한 함수 제거)
DROP FUNCTION IF EXISTS public.set_admin_by_email;

-- 관리자 확인 함수 재정의 (디버깅 코드 제거 및 최적화)
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

-- 특정 사용자의 역할을 반환하는 함수 (디버깅 코드 제거 및 최적화)
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