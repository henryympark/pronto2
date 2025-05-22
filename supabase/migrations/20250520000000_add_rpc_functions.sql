-- 예약 정보를 조회하는 RPC 함수 생성
CREATE OR REPLACE FUNCTION public.get_user_reservations(user_id UUID)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', r.id,
    'service_id', r.service_id,
    'customer_id', r.customer_id,
    'reservation_date', r.reservation_date,
    'start_time', r.start_time,
    'end_time', r.end_time,
    'total_hours', r.total_hours,
    'total_price', r.total_price,
    'status', r.status,
    'customer_name', r.customer_name,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'original_total_price', r.original_total_price,
    'recalculated_total_amount', r.recalculated_total_amount,
    'pending_payment_amount', r.pending_payment_amount,
    'pending_refund_amount', r.pending_refund_amount,
    'has_review', r.has_review,
    'company_name', r.company_name,
    'shooting_purpose', r.shooting_purpose,
    'vehicle_number', r.vehicle_number,
    'service_details', jsonb_build_object(
      'id', s.id,
      'name', s.name
    )
  )
  FROM public.reservations r
  LEFT JOIN public.services s ON r.service_id = s.id
  WHERE r.customer_id = user_id
  ORDER BY r.reservation_date DESC;
END;
$$;

-- 사용자 대시보드 데이터를 조회하는 RPC 함수 생성
CREATE OR REPLACE FUNCTION public.get_user_dashboard_data(user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accumulated_time INT;
  active_coupons INT;
  completed_reviews INT;
BEGIN
  -- 적립 시간 조회
  SELECT COALESCE(c.accumulated_time_minutes, 0)
  INTO accumulated_time
  FROM public.customers c
  WHERE c.id = user_id;
  
  -- 활성 쿠폰 개수 조회
  SELECT COUNT(*)
  INTO active_coupons
  FROM public.customer_coupons cc
  WHERE cc.customer_id = user_id
    AND cc.is_used = FALSE
    AND (cc.expires_at IS NULL OR cc.expires_at > NOW());
  
  -- 작성한 리뷰 개수 조회
  SELECT COUNT(*)
  INTO completed_reviews
  FROM public.reviews r
  WHERE r.customer_id = user_id;
  
  -- 결과 반환
  RETURN jsonb_build_object(
    'accumulated_time_minutes', COALESCE(accumulated_time, 0),
    'active_coupons_count', COALESCE(active_coupons, 0),
    'reviews_count', COALESCE(completed_reviews, 0)
  );
END;
$$; 