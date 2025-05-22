-- 리뷰 테이블 생성
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 1000),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_review_per_reservation UNIQUE (reservation_id)
);

-- 리뷰 이미지 테이블 생성
CREATE TABLE IF NOT EXISTS public.review_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT max_images_per_review CHECK (
    (SELECT COUNT(*) FROM public.review_images WHERE review_id = review_images.review_id) <= 5
  )
);

-- 예약 테이블에 리뷰 작성 여부 필드 추가
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS has_review BOOLEAN NOT NULL DEFAULT false;

-- 리뷰 작성 시 예약의 has_review 필드를 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.update_reservation_has_review()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reservations
  SET has_review = true
  WHERE id = NEW.reservation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 리뷰 삭제 시 예약의 has_review 필드를 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.update_reservation_has_review_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reservations
  SET has_review = false
  WHERE id = NEW.reservation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 서비스의 평균 별점과 리뷰 수를 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.update_service_rating()
RETURNS TRIGGER AS $$
DECLARE
  service_id_var UUID;
  avg_rating_var NUMERIC;
  review_count_var INTEGER;
BEGIN
  -- 트리거 이벤트에 따라 서비스 ID 설정
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL) THEN
    service_id_var := OLD.service_id;
  ELSE
    service_id_var := NEW.service_id;
  END IF;
  
  -- 평균 별점과 리뷰 수 계산
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO 
    avg_rating_var,
    review_count_var
  FROM public.reviews
  WHERE 
    service_id = service_id_var
    AND deleted_at IS NULL
    AND is_hidden = false;
  
  -- 서비스 테이블 업데이트
  UPDATE public.services
  SET 
    avg_rating = avg_rating_var,
    review_count = review_count_var
  WHERE id = service_id_var;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 리뷰 작성 시 예약의 has_review 필드를 업데이트하는 트리거
CREATE TRIGGER update_reservation_has_review_trigger
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_reservation_has_review();

-- 리뷰 삭제 시 예약의 has_review 필드를 업데이트하는 트리거
CREATE TRIGGER update_reservation_has_review_on_delete_trigger
AFTER UPDATE OF deleted_at ON public.reviews
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION public.update_reservation_has_review_on_delete();

-- 리뷰 작성/수정/삭제 시 서비스의 평균 별점과 리뷰 수를 업데이트하는 트리거
CREATE TRIGGER update_service_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_service_rating();

-- 서비스 테이블에 평균 별점과 리뷰 수 필드 추가
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0; 