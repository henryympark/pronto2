-- holidays 테이블 생성 마이그레이션
-- 운영자 휴무일(특정 날짜 전체 휴무) 관리용

BEGIN;

-- holidays 테이블이 없는 경우에만 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'holidays'
  ) THEN
    CREATE TABLE public.holidays (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
      holiday_date DATE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(service_id, holiday_date)
    );
  END IF;
END $$;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'holidays_updated_at_trigger'
  ) THEN
    CREATE TRIGGER holidays_updated_at_trigger
    BEFORE UPDATE ON public.holidays
    FOR EACH ROW
    EXECUTE PROCEDURE update_holidays_updated_at();
  END IF;
END $$;

-- RLS 정책 설정
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- 모든 사용자는 휴무일 정보 조회 가능
CREATE POLICY "Anyone can view holidays" 
  ON public.holidays FOR SELECT 
  USING (true);

-- 관리자는 휴무일 추가/수정/삭제 가능
CREATE POLICY "Only admins can modify holidays" 
  ON public.holidays FOR ALL
  USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

COMMIT; 