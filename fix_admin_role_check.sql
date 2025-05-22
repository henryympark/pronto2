-- 관리자 로그인 문제 해결을 위한 함수 개선
BEGIN;

-- get_customer_role 함수 최적화 및 디버깅 개선
-- 트림 및 소문자 변환 추가, 디버그 로깅 강화
CREATE OR REPLACE FUNCTION public.get_customer_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- 지정된 사용자의 역할 조회
  SELECT role, email INTO user_role, user_email
  FROM public.customers
  WHERE id = user_id;
  
  -- 역할이 NULL이면 로그 기록
  IF user_role IS NULL THEN
    RAISE LOG 'get_customer_role: 사용자 역할이 NULL입니다. 사용자 ID: %, 이메일: %', user_id, user_email;
    RETURN NULL;
  END IF;
  
  -- 역할 소문자 변환 및 트림 후 반환
  user_role := LOWER(TRIM(user_role));
  
  -- 디버깅을 위한 로그
  RAISE LOG 'get_customer_role: 사용자 ID %, 이메일 %, 역할 %', user_id, user_email, user_role;
  
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'get_customer_role 함수 오류: %', SQLERRM;
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
  user_email TEXT;
BEGIN
  -- 현재 인증된 사용자 ID 가져오기
  user_id := auth.uid();
  
  -- 역할 및 이메일로 확인
  SELECT role, email INTO user_role, user_email
  FROM public.customers
  WHERE id = user_id;
  
  -- 역할이 NULL이면 로그 기록
  IF user_role IS NULL THEN
    RAISE LOG 'check_admin_access: 사용자 역할이 NULL입니다. 사용자 ID: %, 이메일: %', user_id, user_email;
    RETURN false;
  END IF;
  
  -- 역할 소문자 변환 및 트림
  user_role := LOWER(TRIM(user_role));
  
  -- 디버깅을 위한 로그
  RAISE LOG 'check_admin_access: 사용자 ID %, 이메일 %, 역할 %, 관리자 여부: %', 
             user_id, user_email, user_role, user_role = 'admin';
  
  -- 관리자 여부 반환 (소문자로 비교)
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'check_admin_access 함수 오류: %', SQLERRM;
    RETURN false;
END;
$$;

-- 함수에 대한 실행 권한 재설정
GRANT EXECUTE ON FUNCTION public.check_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_role(UUID) TO authenticated;

-- 알려진 관리자 계정들의 역할이 정확히 'admin'(소문자)으로 설정되어 있는지 확인하고 수정
UPDATE public.customers
SET role = 'admin'
WHERE email IN ('admin@pronto.com', 'henry.ympark@gmail.com')
  AND (role IS NULL OR role <> 'admin' OR role <> LOWER(TRIM(role)));

-- 업데이트된 결과 로깅
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.customers
  WHERE role = 'admin';
  
  RAISE LOG '관리자 계정 수: %', admin_count;
  
  -- 관리자 계정 목록
  RAISE LOG '관리자 계정 목록:';
  FOR r IN (
    SELECT id, email, role
    FROM public.customers
    WHERE role = 'admin'
  ) LOOP
    RAISE LOG '관리자 ID: %, 이메일: %, 역할: %', r.id, r.email, r.role;
  END LOOP;
END $$;

COMMIT; 