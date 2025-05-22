-- 어드민 역할 체크 함수 개선
-- 대소문자와 공백 처리를 통한 정확한 역할 확인
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  _user_id uuid;
BEGIN
  -- 현재 로그인한 사용자 ID 가져오기
  _user_id := auth.uid();
  
  -- 디버깅 로그
  RAISE NOTICE 'Checking admin access for user: %', _user_id;
  
  IF _user_id IS NULL THEN
    RAISE NOTICE 'User not authenticated';
    RETURN false;
  END IF;
  
  -- customer 테이블에서 사용자의 역할이 'admin'인지 확인 (대소문자 무시, 공백 제거)
  SELECT EXISTS (
    SELECT 1
    FROM customers
    WHERE 
      id = _user_id
      AND LOWER(TRIM(role)) = 'admin'
  ) INTO is_admin;
  
  -- 디버깅 로그
  RAISE NOTICE 'Admin check result: %', is_admin;
  
  RETURN is_admin;
END;
$$;

-- 어드민 확인 RPC 함수에 주석 추가
COMMENT ON FUNCTION public.check_admin_access IS '현재 로그인한 사용자가 관리자 권한을 가지고 있는지 확인합니다.';

-- customer_role 가져오기 함수 개선
CREATE OR REPLACE FUNCTION public.get_customer_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role text;
BEGIN
  -- 사용자 역할 조회
  SELECT role INTO _role FROM customers WHERE id = user_id;
  
  -- 역할이 없으면 기본값 반환
  IF _role IS NULL THEN
    RETURN 'customer';
  END IF;
  
  -- 역할 값 반환 (디버깅 로그 추가)
  RAISE NOTICE 'User % role: %', user_id, _role;
  RETURN _role;
END;
$$;

-- 헨리와 관리자 계정에 admin 역할 보장
UPDATE customers
SET role = 'admin'
WHERE 
  email IN ('admin@pronto.com', 'henry.ympark@gmail.com') 
  OR LOWER(TRIM(role)) = 'admin';

-- 디버깅을 위한 어드민 계정 역할 조회
SELECT id, email, role, auth_provider
FROM customers
WHERE LOWER(TRIM(role)) = 'admin'; 