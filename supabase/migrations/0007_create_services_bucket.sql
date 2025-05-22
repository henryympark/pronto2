-- Create services bucket for image storage
-- 버킷이 없을 경우에만 생성하는 idempotent한 방식 적용

-- 트랜잭션 시작
BEGIN;

-- services 버킷 생성 (이미 존재하는지 확인)
DO $$
BEGIN
    -- 버킷이 이미 존재하는지 확인
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'services'
    ) THEN
        -- services 버킷 생성
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('services', 'services', true);
        
        RAISE NOTICE 'services 버킷이 생성되었습니다.';
    ELSE
        RAISE NOTICE 'services 버킷이 이미 존재합니다.';
    END IF;
END $$;

-- 버킷에 대한 RLS 정책 설정
-- 모든 사용자가 읽기 가능
CREATE POLICY IF NOT EXISTS "Anyone can read services images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'services');

-- 관리자만 쓰기/수정/삭제 가능
CREATE POLICY IF NOT EXISTS "Only admins can upload services images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'services' AND 
  (auth.uid() IN (SELECT id FROM public.customers WHERE role = 'admin'))
);

CREATE POLICY IF NOT EXISTS "Only admins can update services images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'services' AND 
  (auth.uid() IN (SELECT id FROM public.customers WHERE role = 'admin'))
);

CREATE POLICY IF NOT EXISTS "Only admins can delete services images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'services' AND 
  (auth.uid() IN (SELECT id FROM public.customers WHERE role = 'admin'))
);

-- 커밋
COMMIT; 