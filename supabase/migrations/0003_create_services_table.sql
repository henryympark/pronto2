-- Create services table
-- 테이블이 없을 경우에만 생성하는 idempotent한 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 테이블이 없을 경우에만 생성
CREATE TABLE IF NOT EXISTS public.services (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 서비스 코드 (slug)
  slug TEXT UNIQUE NOT NULL,
  
  -- 서비스 기본 정보
  name TEXT NOT NULL,
  description TEXT,
  price_per_hour INTEGER NOT NULL,
  location TEXT,
  image_url TEXT,
  
  -- 추가 정보
  notice TEXT,  -- 주의사항/약관
  refund_policy TEXT,  -- 환불 정책
  
  -- 통계 정보
  average_rating FLOAT DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신을 위한 트리거 생성
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE PROCEDURE update_services_updated_at();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS services_name_idx ON public.services(name);
CREATE INDEX IF NOT EXISTS services_slug_idx ON public.services(slug);

-- 샘플 데이터 추가 (테스트용)
INSERT INTO public.services (
  id,
  slug,
  name, 
  description, 
  price_per_hour, 
  location, 
  image_url, 
  notice, 
  refund_policy,
  average_rating,
  review_count
) VALUES (
  gen_random_uuid(),
  'pronto-a',
  '프론토 스튜디오 A',
  '깔끔하고 모던한 스튜디오 공간으로, 인물 촬영과 소품 촬영에 적합합니다. 자연광이 잘 들어오는 공간으로 별도 조명 없이도 화사한 분위기 연출이 가능합니다.',
  30000,
  '서울 강남구 테헤란로 123',
  'https://picsum.photos/seed/pronto_main/1200/600',
  '- 예약 시간 준수 (초과 시 추가 요금 발생)
- 스튜디오 내 취식 금지
- 장비 사용 후 원위치
- 퇴실 시 개인 물품 확인',
  '- 이용 7일 전: 100% 환불
- 이용 3일 전: 70% 환불
- 이용 1일 전: 50% 환불
- 이용 당일: 환불 불가',
  4.8,
  24
) ON CONFLICT (slug) DO NOTHING;  -- 이미 존재하는 경우 무시

-- 추가 서비스 예시
INSERT INTO public.services (
  id,
  slug,
  name, 
  description, 
  price_per_hour, 
  location, 
  image_url, 
  notice, 
  refund_policy,
  average_rating,
  review_count
) VALUES (
  gen_random_uuid(),
  'pronto-b',
  '프론토 스튜디오 B',
  '넓은 공간과 다양한 소품을 갖춘 프리미엄 스튜디오입니다. 브랜드 화보, 제품 촬영에 적합한 전문 시설을 갖추고 있습니다.',
  50000,
  '서울 강남구 테헤란로 456',
  'https://picsum.photos/seed/pronto_main_b/1200/600',
  '- 전문 장비 사용 시 사전 교육 필수
- 시설 파손 시 배상 책임
- 추가 인원 시 사전 고지 필요',
  '- 이용 7일 전: 100% 환불
- 이용 3일 전: 80% 환불
- 이용 1일 전: 50% 환불
- 이용 당일: 환불 불가',
  4.9,
  18
) ON CONFLICT (slug) DO NOTHING;  -- 이미 존재하는 경우 무시

-- RLS 정책 설정 (Row Level Security)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 서비스 정보를 볼 수 있음
CREATE POLICY "Anyone can view services" 
ON public.services FOR SELECT 
USING (true);

-- 관리자만 서비스 정보를 수정할 수 있음
CREATE POLICY "Only admins can modify services" 
ON public.services FOR UPDATE
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 관리자만 서비스 정보를 삭제할 수 있음
CREATE POLICY "Only admins can delete services" 
ON public.services FOR DELETE
USING ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 관리자만 서비스 정보를 추가할 수 있음
CREATE POLICY "Only admins can insert services" 
ON public.services FOR INSERT
WITH CHECK ((SELECT role FROM public.customers WHERE id = auth.uid()) = 'admin');

-- 커밋
COMMIT; 