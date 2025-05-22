-- 쿠폰 테이블 생성 마이그레이션
-- 고객에게 부여된 쿠폰 정보를 저장하는 테이블

BEGIN;

-- 테이블이 이미 존재하는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_coupons'
  ) THEN
    -- customer_coupons 테이블 생성
    CREATE TABLE public.customer_coupons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
      minutes INTEGER NOT NULL DEFAULT 30, -- 쿠폰 시간 (기본 30분)
      is_used BOOLEAN NOT NULL DEFAULT FALSE, -- 사용 여부
      used_at TIMESTAMP WITH TIME ZONE, -- 사용 시간
      used_reservation_id UUID, -- 사용된 예약 ID (옵션)
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE, -- 만료 시간 (옵션)
      granted_by UUID -- 부여한 운영자 ID (옵션)
    );

    -- 인덱스 생성
    CREATE INDEX idx_customer_coupons_customer_id ON public.customer_coupons(customer_id);
    CREATE INDEX idx_customer_coupons_is_used ON public.customer_coupons(is_used);
    CREATE INDEX idx_customer_coupons_used_at ON public.customer_coupons(used_at) WHERE used_at IS NOT NULL;
    CREATE INDEX idx_customer_coupons_created_at ON public.customer_coupons(created_at);
    CREATE INDEX idx_customer_coupons_expires_at ON public.customer_coupons(expires_at) WHERE expires_at IS NOT NULL;

    -- RLS 정책 설정 (보안)
    ALTER TABLE public.customer_coupons ENABLE ROW LEVEL SECURITY;

    -- 정책: 모든 사용자가 자신의 쿠폰만 조회 가능
    CREATE POLICY "사용자는 자신의 쿠폰만 조회 가능" 
      ON public.customer_coupons 
      FOR SELECT 
      USING (auth.uid() = customer_id);

    -- 정책: 관리자는 모든 쿠폰 조회 가능
    CREATE POLICY "관리자는 모든 쿠폰 조회 가능" 
      ON public.customer_coupons 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM public.customers 
        WHERE id = auth.uid() 
        AND role = 'admin'
      ));

    -- 정책: 관리자는 모든 쿠폰 생성 가능
    CREATE POLICY "관리자는 쿠폰 생성 가능" 
      ON public.customer_coupons 
      FOR INSERT 
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.customers 
        WHERE id = auth.uid() 
        AND role = 'admin'
      ));

    -- 정책: 관리자는 모든 쿠폰 업데이트 가능
    CREATE POLICY "관리자는 쿠폰 업데이트 가능" 
      ON public.customer_coupons 
      FOR UPDATE 
      USING (EXISTS (
        SELECT 1 FROM public.customers 
        WHERE id = auth.uid() 
        AND role = 'admin'
      ));

    -- 정책: 사용자는 자신의 쿠폰 사용 표시 가능 (UPDATE 제한적 허용)
    CREATE POLICY "사용자는 자신의 쿠폰 사용 표시 가능" 
      ON public.customer_coupons 
      FOR UPDATE 
      USING (
        auth.uid() = customer_id AND 
        is_used = FALSE -- 사용되지 않은 쿠폰만 업데이트 가능
      );
  END IF;
END
$$;

-- 트리거 함수: 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.update_customer_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거가 이미 존재하는지 확인 후 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_customer_coupons_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_customer_coupons_updated_at
    BEFORE UPDATE ON public.customer_coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_coupons_updated_at();
  END IF;
END
$$;

-- 권한 설정
GRANT SELECT, INSERT, UPDATE ON public.customer_coupons TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.customer_coupons_id_seq TO authenticated;

COMMIT; 