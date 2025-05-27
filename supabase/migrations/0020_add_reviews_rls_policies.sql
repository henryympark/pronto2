-- reviews 테이블 RLS 정책 설정

-- RLS 활성화
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 리뷰에 접근 가능
CREATE POLICY "관리자는 모든 리뷰를 조회할 수 있습니다" ON public.reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- 관리자는 모든 리뷰를 수정할 수 있습니다
CREATE POLICY "관리자는 모든 리뷰를 수정할 수 있습니다" ON public.reviews
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- 고객은 자신의 리뷰만 조회 가능
CREATE POLICY "고객은 자신의 리뷰를 조회할 수 있습니다" ON public.reviews
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- 고객은 자신의 리뷰를 작성할 수 있습니다
CREATE POLICY "고객은 자신의 리뷰를 작성할 수 있습니다" ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- 고객은 자신의 리뷰를 수정할 수 있습니다
CREATE POLICY "고객은 자신의 리뷰를 수정할 수 있습니다" ON public.reviews
FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- 공개된 리뷰는 모든 사용자가 조회 가능 (서비스 상세 페이지용)
CREATE POLICY "공개된 리뷰는 모든 사용자가 조회할 수 있습니다" ON public.reviews
FOR SELECT
TO anon, authenticated
USING (is_hidden = false AND deleted_at IS NULL);

-- review_images 테이블 정책

-- 관리자는 모든 리뷰 이미지에 접근 가능
CREATE POLICY "관리자는 모든 리뷰 이미지를 조회할 수 있습니다" ON public.review_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- 고객은 자신의 리뷰 이미지만 조회/작성/수정 가능
CREATE POLICY "고객은 자신의 리뷰 이미지를 조회할 수 있습니다" ON public.review_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE reviews.id = review_images.review_id 
    AND reviews.customer_id = auth.uid()
  )
);

CREATE POLICY "고객은 자신의 리뷰 이미지를 작성할 수 있습니다" ON public.review_images
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE reviews.id = review_images.review_id 
    AND reviews.customer_id = auth.uid()
  )
);

CREATE POLICY "고객은 자신의 리뷰 이미지를 삭제할 수 있습니다" ON public.review_images
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE reviews.id = review_images.review_id 
    AND reviews.customer_id = auth.uid()
  )
);

-- 공개된 리뷰의 이미지는 모든 사용자가 조회 가능
CREATE POLICY "공개된 리뷰의 이미지는 모든 사용자가 조회할 수 있습니다" ON public.review_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE reviews.id = review_images.review_id 
    AND reviews.is_hidden = false 
    AND reviews.deleted_at IS NULL
  )
); 