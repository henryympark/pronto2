-- Create customers table
-- 테이블이 없을 경우에만 생성하는 idempotent한 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 테이블이 없을 경우에만 생성
CREATE TABLE IF NOT EXISTS public.customers (
  -- 기본 식별자, Supabase auth.users와 동일한 ID 사용
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 사용자 기본 정보
  email TEXT,
  nickname TEXT,
  phone TEXT,
  
  -- 인증 관련 정보
  auth_provider TEXT NOT NULL DEFAULT 'email',  -- 'email', 'kakao', 'naver' 등
  role TEXT NOT NULL DEFAULT 'customer',        -- 'customer', 'admin' 등
  is_active BOOLEAN NOT NULL DEFAULT true,      -- 계정 활성화 상태
  
  -- 적립 시간 관련 필드
  accumulated_time_minutes INTEGER NOT NULL DEFAULT 0,  -- 적립된 시간 (분 단위)
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE          -- 계정 삭제 시간 (soft delete)
);

-- updated_at 자동 갱신을 위한 트리거 생성
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE PROCEDURE update_customers_updated_at();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
CREATE INDEX IF NOT EXISTS customers_auth_provider_idx ON public.customers(auth_provider);
CREATE INDEX IF NOT EXISTS customers_role_idx ON public.customers(role);
CREATE INDEX IF NOT EXISTS customers_is_active_idx ON public.customers(is_active);

-- RLS 정책 설정 (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own data" 
ON public.customers FOR SELECT 
USING (auth.uid() = id);

-- 관리자는 모든 고객 정보 조회 가능
CREATE POLICY "Admin can view all customers" 
ON public.customers FOR SELECT 
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 모든 인증된 사용자는 자신의 정보만 수정 가능
CREATE POLICY "Users can update own data" 
ON public.customers FOR UPDATE
USING (auth.uid() = id);

-- 관리자는 모든 고객 정보 수정 가능
CREATE POLICY "Admin can update all customers" 
ON public.customers FOR UPDATE
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 익명 사용자는 새 고객 정보를 생성할 수 없음 (Supabase auth를 통해서만 가능)

-- 커밋
COMMIT; 