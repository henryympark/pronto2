-- 서비스 운영 시간 및 차단된 시간 테이블 생성
-- 테이블이 없을 경우에만 생성하는 idempotent한 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 서비스 운영 시간 테이블 생성
CREATE TABLE IF NOT EXISTS public.service_operating_hours (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 서비스 관계 정보
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  
  -- 요일 정보 (0: 일요일, 1: 월요일, ..., 6: 토요일)
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  
  -- 운영 시간
  start_time TEXT NOT NULL, -- HH:MM 형식
  end_time TEXT NOT NULL, -- HH:MM 형식
  
  -- 휴무일 여부
  is_closed BOOLEAN NOT NULL DEFAULT false,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- 복합 유니크 키 (서비스 ID + 요일)
  UNIQUE(service_id, day_of_week)
);

-- 차단된 시간 테이블 생성
CREATE TABLE IF NOT EXISTS public.blocked_times (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 서비스 관계 정보
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  
  -- 차단 날짜
  blocked_date DATE NOT NULL,
  
  -- 차단 시간
  start_time TEXT NOT NULL, -- HH:MM 형식
  end_time TEXT NOT NULL, -- HH:MM 형식
  
  -- 설명 (선택)
  description TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신을 위한 트리거 함수 생성 (service_operating_hours)
CREATE OR REPLACE FUNCTION update_service_operating_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_operating_hours_updated_at ON public.service_operating_hours;
CREATE TRIGGER service_operating_hours_updated_at
BEFORE UPDATE ON public.service_operating_hours
FOR EACH ROW
EXECUTE PROCEDURE update_service_operating_hours_updated_at();

-- updated_at 자동 갱신을 위한 트리거 함수 생성 (blocked_times)
CREATE OR REPLACE FUNCTION update_blocked_times_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blocked_times_updated_at ON public.blocked_times;
CREATE TRIGGER blocked_times_updated_at
BEFORE UPDATE ON public.blocked_times
FOR EACH ROW
EXECUTE PROCEDURE update_blocked_times_updated_at();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS service_operating_hours_service_id_idx ON public.service_operating_hours(service_id);
CREATE INDEX IF NOT EXISTS service_operating_hours_day_of_week_idx ON public.service_operating_hours(day_of_week);

CREATE INDEX IF NOT EXISTS blocked_times_service_id_idx ON public.blocked_times(service_id);
CREATE INDEX IF NOT EXISTS blocked_times_blocked_date_idx ON public.blocked_times(blocked_date);

-- RLS 정책 설정 (Row Level Security)
ALTER TABLE public.service_operating_hours ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 운영 시간 정보를 볼 수 있음
CREATE POLICY "Anyone can view operating hours" 
ON public.service_operating_hours FOR SELECT 
USING (true);

-- 관리자만 운영 시간 정보를 수정할 수 있음
CREATE POLICY "Only admins can modify operating hours" 
ON public.service_operating_hours FOR ALL
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- RLS 정책 설정 (Row Level Security)
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 차단된 시간 정보를 볼 수 있음
CREATE POLICY "Anyone can view blocked times" 
ON public.blocked_times FOR SELECT 
USING (true);

-- 관리자만 차단된 시간 정보를 수정할 수 있음
CREATE POLICY "Only admins can modify blocked times" 
ON public.blocked_times FOR ALL
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 샘플 데이터 추가: Pronto 스튜디오 A 운영 시간 (모든 요일 06:00 ~ 24:00)
INSERT INTO public.service_operating_hours (service_id, day_of_week, start_time, end_time, is_closed)
SELECT
  (SELECT id FROM public.services WHERE slug = 'pronto-a'),
  day_of_week,
  '06:00',
  '24:00',
  false
FROM
  generate_series(0, 6) AS day_of_week
ON CONFLICT (service_id, day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_closed = EXCLUDED.is_closed;

-- 샘플 데이터 추가: Pronto 스튜디오 B 운영 시간 (평일 09:00 ~ 22:00, 주말 10:00 ~ 18:00, 일요일 휴무)
DO $$
DECLARE
  service_id UUID;
BEGIN
  SELECT id INTO service_id FROM public.services WHERE slug = 'pronto-b';
  
  -- 일요일: 휴무
  INSERT INTO public.service_operating_hours (service_id, day_of_week, start_time, end_time, is_closed)
  VALUES (service_id, 0, '09:00', '22:00', true)
  ON CONFLICT (service_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_closed = EXCLUDED.is_closed;
  
  -- 월~금: 09:00 ~ 22:00
  INSERT INTO public.service_operating_hours (service_id, day_of_week, start_time, end_time, is_closed)
  SELECT
    service_id,
    day_of_week,
    '09:00',
    '22:00',
    false
  FROM
    generate_series(1, 5) AS day_of_week
  ON CONFLICT (service_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_closed = EXCLUDED.is_closed;
  
  -- 토요일: 10:00 ~ 18:00
  INSERT INTO public.service_operating_hours (service_id, day_of_week, start_time, end_time, is_closed)
  VALUES (service_id, 6, '10:00', '18:00', false)
  ON CONFLICT (service_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_closed = EXCLUDED.is_closed;
END $$;

-- 샘플 데이터 추가: 내일 날짜에 10:00~12:00 차단 (Pronto 스튜디오 A)
INSERT INTO public.blocked_times (
  service_id,
  blocked_date,
  start_time,
  end_time,
  description
)
VALUES (
  (SELECT id FROM public.services WHERE slug = 'pronto-a'),
  (CURRENT_DATE + INTERVAL '1 day'),
  '10:00',
  '12:00',
  '정기 점검 시간'
);

-- 커밋
COMMIT; 