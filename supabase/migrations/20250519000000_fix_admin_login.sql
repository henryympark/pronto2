-- 관리자 로그인 문제 해결
BEGIN;

-- admin@pronto.co.kr 강제 설정 제거하고 역할 확인 함수만 개선

-- get_customer_role 함수 최적화 및 디버깅 개선
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

-- check_admin_access 함수도 함께 개선
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  user_role TEXT;
BEGIN
  -- 현재 인증된 사용자 ID 가져오기
  user_id := auth.uid();
  
  -- 역할로 확인
  SELECT role INTO user_role
  FROM public.customers
  WHERE id = user_id;
  
  -- 관리자 여부 반환
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 함수에 대한 실행 권한 재설정
GRANT EXECUTE ON FUNCTION public.check_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_role(UUID) TO authenticated;

COMMIT; 