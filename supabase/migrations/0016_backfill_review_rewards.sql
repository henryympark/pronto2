-- 기존 리뷰들에 대한 적립시간 소급 적용
-- 각 리뷰당 10분씩 적립시간 부여

-- 1. 각 고객별 리뷰 개수와 현재 적립시간 확인
WITH review_stats AS (
  SELECT 
    c.id as customer_id,
    c.email,
    c.accumulated_time_minutes as current_time,
    COUNT(r.id) as review_count,
    COUNT(r.id) * 10 as should_have_time
  FROM customers c
  LEFT JOIN reviews r ON c.id = r.customer_id
  GROUP BY c.id, c.email, c.accumulated_time_minutes
  HAVING COUNT(r.id) > 0
)

-- 2. 적립시간이 부족한 고객들의 적립시간을 올바르게 업데이트
UPDATE customers 
SET 
  accumulated_time_minutes = review_stats.should_have_time,
  updated_at = NOW()
FROM review_stats
WHERE customers.id = review_stats.customer_id
  AND customers.accumulated_time_minutes < review_stats.should_have_time;

-- 3. 결과 확인 쿼리 (주석으로 남겨둠)
/*
SELECT 
  c.id,
  c.email,
  c.accumulated_time_minutes as current_time,
  COUNT(r.id) as review_count,
  COUNT(r.id) * 10 as should_have_time,
  (COUNT(r.id) * 10) - c.accumulated_time_minutes as difference
FROM customers c
LEFT JOIN reviews r ON c.id = r.customer_id
GROUP BY c.id, c.email, c.accumulated_time_minutes
HAVING COUNT(r.id) > 0
ORDER BY review_count DESC;
*/ 