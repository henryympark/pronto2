-- Row Level Security 정책 수정
-- customers 테이블 RLS 정책 수정

-- 기존 정책 삭제 및 재생성
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "사용자는 자신의 데이터만 조회 가능" ON customers;
DROP POLICY IF EXISTS "사용자는 자신의 데이터만 업데이트 가능" ON customers;
DROP POLICY IF EXISTS "관리자는 모든 고객 데이터에 접근 가능" ON customers;
DROP POLICY IF EXISTS "서비스 역할은 모든 고객 데이터에 접근 가능" ON customers;

-- 새로운 정책 생성
-- 1. 사용자는 자신의 데이터 조회 가능
CREATE POLICY "사용자는 자신의 데이터만 조회 가능"
  ON customers FOR SELECT
  USING (auth.uid() = id);

-- 2. 사용자는 자신의 데이터 업데이트 가능
CREATE POLICY "사용자는 자신의 데이터만 업데이트 가능"
  ON customers FOR UPDATE
  USING (auth.uid() = id);

-- 3. 관리자는 모든 데이터 접근 가능
CREATE POLICY "관리자는 모든 고객 데이터에 접근 가능"
  ON customers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. 서비스 역할은 모든 데이터 접근 가능
CREATE POLICY "서비스 역할은 모든 고객 데이터에 접근 가능"
  ON customers FOR ALL
  USING (auth.jwt() ? ->> 'role' = 'service_role');

-- reservations 테이블 RLS 정책 수정
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can view all reservations" ON reservations;
DROP POLICY IF EXISTS "Users can create their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete their own reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;

-- 새로운 정책 생성
-- 1. 사용자는 본인의 예약만 볼 수 있음
CREATE POLICY "Users can view their own reservations" 
ON reservations FOR SELECT 
USING (auth.uid() = customer_id);

-- 2. 관리자는 모든 예약을 볼 수 있음
CREATE POLICY "Admins can view all reservations" 
ON reservations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM customers 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. 사용자는 본인의 예약만 생성 가능
CREATE POLICY "Users can create their own reservations" 
ON reservations FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

-- 4. 사용자는 본인의 예약만 수정 가능
CREATE POLICY "Users can update their own reservations" 
ON reservations FOR UPDATE 
USING (auth.uid() = customer_id);

-- 5. 사용자는 본인의 예약만 삭제 가능
CREATE POLICY "Users can delete their own reservations" 
ON reservations FOR DELETE 
USING (auth.uid() = customer_id);

-- 6. 관리자는 모든 예약을 관리 가능
CREATE POLICY "Admins can manage all reservations" 
ON reservations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM customers 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 고객 정보가 없는 사용자를 위한 백업 함수 생성
CREATE OR REPLACE FUNCTION public.ensure_customer_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'customer',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 사용자를 customers 테이블에 등록하는 함수
CREATE OR REPLACE FUNCTION public.sync_missing_customers()
RETURNS void AS $$
BEGIN
  INSERT INTO public.customers (id, email, name, role, created_at, updated_at)
  SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', email),
    'customer',
    NOW(),
    NOW()
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.customers)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행하여 누락된 고객 정보 등록
SELECT sync_missing_customers(); 