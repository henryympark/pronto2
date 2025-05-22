-- customers 테이블이 없는 경우 생성
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  company_name TEXT,
  auth_provider TEXT,
  role TEXT DEFAULT 'customer',
  is_active BOOLEAN DEFAULT TRUE,
  accumulated_time_minutes INTEGER DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기존 RLS 정책 재설정
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 고객 데이터에 접근 가능
DROP POLICY IF EXISTS "관리자는 모든 고객 데이터에 접근 가능" ON customers;
CREATE POLICY "관리자는 모든 고객 데이터에 접근 가능"
  ON customers
  USING (
    auth.uid() IN (
      SELECT id FROM customers WHERE role = 'admin'
    )
  );

-- 사용자는 자신의 데이터만 조회 가능
DROP POLICY IF EXISTS "사용자는 자신의 데이터만 조회 가능" ON customers;
CREATE POLICY "사용자는 자신의 데이터만 조회 가능"
  ON customers
  FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 데이터만 업데이트 가능
DROP POLICY IF EXISTS "사용자는 자신의 데이터만 업데이트 가능" ON customers;
CREATE POLICY "사용자는 자신의 데이터만 업데이트 가능"
  ON customers
  FOR UPDATE
  USING (auth.uid() = id);

-- 서비스 역할은 모든 고객 데이터에 접근 가능 (Edge Functions 등에서 사용)
DROP POLICY IF EXISTS "서비스 역할은 모든 고객 데이터에 접근 가능" ON customers;
CREATE POLICY "서비스 역할은 모든 고객 데이터에 접근 가능"
  ON customers
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 신규 사용자 등록 시 자동으로 customers 테이블에 추가하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, name, auth_provider, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_app_meta_data->>'provider',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 이미 존재하는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$; 