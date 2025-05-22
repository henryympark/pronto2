-- 관리자가 모든 고객 정보를 조회할 수 있도록 RLS 정책 추가

-- 트랜잭션 시작
BEGIN;

-- 기존 정책이 있으면 먼저 삭제 (중복 방지)
DROP POLICY IF EXISTS "Admin can view all customers" ON public.customers;

-- 관리자는 모든 고객 정보 조회 가능 정책 추가
CREATE POLICY "Admin can view all customers" 
ON public.customers FOR SELECT 
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 디버깅용 로그
DO $$
BEGIN
  RAISE NOTICE 'Added RLS policy: Admin can view all customers';
END $$;

-- 트랜잭션 커밋
COMMIT; 