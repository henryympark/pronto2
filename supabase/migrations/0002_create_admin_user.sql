-- 운영자 계정 생성 마이그레이션

-- NOTE: 아래 계정 정보는 예시이며, 실제 운영 환경에서는 변경해야 함
-- 본 마이그레이션은 개발 목적으로 사용하는 관리자 계정을 만드는 것이므로
-- 실제 운영 환경에서는 대시보드를 통해 관리자 계정을 생성하고 관리하는 것이 좋습니다.

BEGIN;

-- 1. auth.users 테이블에 운영자 계정 생성 (이미 존재하지 않는 경우)
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT := 'admin@pronto.com';
  admin_hashed_password TEXT;
BEGIN
  -- 이미 존재하는 사용자인지 확인
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
  
  -- 존재하지 않는 경우에만 생성
  IF admin_id IS NULL THEN
    -- 비밀번호 해시 생성 (여기서는 supabase 내부 함수 사용)
    admin_hashed_password := crypt('admin1234', gen_salt('bf'));
    
    -- 사용자 생성
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) 
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      admin_email,
      admin_hashed_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"관리자"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
    
    -- 2. customers 테이블에 운영자 정보 추가
    INSERT INTO public.customers (
      id, 
      email, 
      auth_provider,
      role,
      nickname,
      created_at,
      updated_at
    ) 
    VALUES (
      admin_id, 
      admin_email, 
      'email',
      'admin',
      '관리자',
      now(),
      now()
    );
    
    RAISE NOTICE 'Admin user created with ID: %', admin_id;
  ELSE
    -- 이미 존재하면 역할만 admin으로 변경
    UPDATE public.customers
    SET role = 'admin'
    WHERE id = admin_id;
    
    RAISE NOTICE 'Admin user already exists with ID: %', admin_id;
  END IF;
END $$;

COMMIT; 