-- 디버깅을 위한 어드민 접근 함수 개선
BEGIN;

-- 관리자 확인 함수 디버깅 버전
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- 현재 인증된 사용자 ID 가져오기
  user_id := auth.uid();
  
  -- 디버깅용 로그
  RAISE LOG 'check_admin_access 호출됨: 사용자 ID %', user_id;
  
  -- 현재 인증된 사용자의 역할 조회
  SELECT role INTO user_role
  FROM public.customers
  WHERE id = user_id;
  
  -- 디버깅용 로그
  RAISE LOG 'check_admin_access 결과: 사용자 % 역할 %', user_id, COALESCE(user_role, 'NULL');
  
  -- 역할이 'admin'인 경우 true 반환
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'check_admin_access 예외 발생: %', SQLERRM;
    RETURN false;
END;
$$;

-- 특정 사용자의 역할을 반환하는 함수 (디버깅 버전)
CREATE OR REPLACE FUNCTION public.get_customer_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 디버깅용 로그
  RAISE LOG 'get_customer_role 호출됨: 사용자 ID %', user_id;
  
  -- 지정된 사용자의 역할 조회
  SELECT role INTO user_role
  FROM public.customers
  WHERE id = user_id;
  
  -- 디버깅용 로그
  RAISE LOG 'get_customer_role 결과: 사용자 % 역할 %', user_id, COALESCE(user_role, 'NULL');
  
  -- 역할 반환
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'get_customer_role 예외 발생: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 특정 이메일 주소를 가진 사용자를 관리자로 설정하는 함수
CREATE OR REPLACE FUNCTION public.set_admin_by_email(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  updated_row_count INTEGER;
BEGIN
  -- 이메일로 사용자 ID 찾기
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF user_id IS NULL THEN
    RETURN '사용자를 찾을 수 없습니다: ' || admin_email;
  END IF;
  
  -- 사용자 역할을 admin으로 업데이트
  UPDATE public.customers
  SET role = 'admin'
  WHERE id = user_id;
  
  GET DIAGNOSTICS updated_row_count = ROW_COUNT;
  
  IF updated_row_count = 0 THEN
    -- customers 테이블에 사용자가 없으면 추가
    INSERT INTO public.customers (id, email, role, created_at, updated_at)
    VALUES (user_id, admin_email, 'admin', now(), now());
    RETURN '관리자 추가 완료: ' || admin_email;
  END IF;
  
  RETURN '관리자 업데이트 완료: ' || admin_email;
END;
$$;

-- henry.ympark@gmail.com 사용자를 관리자로 지정
DO $$
BEGIN
  PERFORM public.set_admin_by_email('henry.ympark@gmail.com');
END
$$;

-- 함수에 대한 실행 권한 설정
GRANT EXECUTE ON FUNCTION public.check_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_by_email(TEXT) TO authenticated;

COMMIT; 