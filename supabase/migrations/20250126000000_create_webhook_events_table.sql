-- 웹훅 이벤트 시스템 테이블 생성
-- Event-driven 아키텍처를 위한 웹훅 이벤트 로깅 및 재시도 메커니즘

-- 트랜잭션 시작
BEGIN;

-- 웹훅 이벤트 테이블 생성
CREATE TABLE IF NOT EXISTS public.webhook_events (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 이벤트 정보
  event_type VARCHAR(100) NOT NULL, -- 'booking.extended', 'coupon.granted' 등
  event_data JSONB NOT NULL, -- 웹훅 페이로드 전체 데이터
  
  -- 발송 정보
  webhook_url TEXT, -- 발송된 웹훅 URL (환경변수에서 가져온 값)
  webhook_secret TEXT, -- 발송 시 사용된 시크릿 (해시값만 저장)
  
  -- 상태 정보
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  retry_count INTEGER DEFAULT 0, -- 재시도 횟수
  max_retries INTEGER DEFAULT 3, -- 최대 재시도 횟수
  
  -- 응답 정보
  response_status INTEGER, -- HTTP 응답 코드
  response_body TEXT, -- 응답 본문 (오류 디버깅용)
  
  -- 시간 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE, -- 성공적으로 발송된 시간
  failed_at TIMESTAMP WITH TIME ZONE, -- 실패한 시간
  next_retry_at TIMESTAMP WITH TIME ZONE, -- 다음 재시도 예정 시간
  
  -- 연관 정보
  related_entity_type VARCHAR(50), -- 'reservation', 'customer', 'review' 등
  related_entity_id UUID, -- 연관된 엔터티의 ID
  
  -- 메타데이터
  created_by UUID, -- 이벤트를 생성한 사용자 (nullable)
  notes TEXT -- 추가 메모나 오류 세부사항
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry_at ON public.webhook_events(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_webhook_events_related_entity ON public.webhook_events(related_entity_type, related_entity_id);

-- 웹훅 이벤트 생성 함수
CREATE OR REPLACE FUNCTION public.create_webhook_event(
  p_event_type VARCHAR(100),
  p_event_data JSONB,
  p_related_entity_type VARCHAR(50) DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_max_retries INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
  v_webhook_event_id UUID;
  v_webhook_url TEXT;
  v_webhook_secret TEXT;
BEGIN
  -- 환경변수에서 웹훅 설정 확인
  v_webhook_url := current_setting('app.webhook_url', true);
  v_webhook_secret := current_setting('app.webhook_secret', true);
  
  -- 웹훅 이벤트 생성
  INSERT INTO public.webhook_events (
    event_type,
    event_data,
    webhook_url,
    webhook_secret,
    related_entity_type,
    related_entity_id,
    created_by,
    max_retries,
    status
  ) VALUES (
    p_event_type,
    p_event_data,
    v_webhook_url,
    CASE WHEN v_webhook_secret IS NOT NULL THEN digest(v_webhook_secret, 'sha256')::text ELSE NULL END,
    p_related_entity_type,
    p_related_entity_id,
    p_created_by,
    p_max_retries,
    'pending'
  )
  RETURNING id INTO v_webhook_event_id;
  
  RETURN v_webhook_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 웹훅 이벤트 상태 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_webhook_event_status(
  p_event_id UUID,
  p_status VARCHAR(20),
  p_response_status INTEGER DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  UPDATE public.webhook_events
  SET 
    status = p_status,
    response_status = COALESCE(p_response_status, response_status),
    response_body = COALESCE(p_response_body, response_body),
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
    retry_count = CASE 
      WHEN p_status = 'failed' AND status != 'failed' THEN retry_count + 1
      ELSE retry_count 
    END,
    next_retry_at = CASE
      WHEN p_status = 'failed' AND retry_count < max_retries THEN
        NOW() + INTERVAL '1 minute' * POWER(2, retry_count) -- 지수 백오프: 1분, 2분, 4분...
      ELSE NULL
    END
  WHERE id = p_event_id;
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  
  RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 재시도 대상 웹훅 이벤트 조회 함수
CREATE OR REPLACE FUNCTION public.get_webhook_events_for_retry()
RETURNS TABLE (
  id UUID,
  event_type VARCHAR(100),
  event_data JSONB,
  webhook_url TEXT,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    we.id,
    we.event_type,
    we.event_data,
    we.webhook_url,
    we.retry_count
  FROM public.webhook_events we
  WHERE we.status = 'failed'
    AND we.retry_count < we.max_retries
    AND (we.next_retry_at IS NULL OR we.next_retry_at <= NOW())
  ORDER BY we.created_at ASC
  LIMIT 50; -- 한 번에 최대 50개씩 처리
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 오래된 웹훅 이벤트 정리 함수 (30일 이상된 성공 이벤트, 7일 이상된 실패 이벤트)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_temp_count INTEGER;
BEGIN
  -- 30일 이상된 성공 이벤트 삭제
  DELETE FROM public.webhook_events
  WHERE status = 'sent' 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_count := v_deleted_count + v_temp_count;
  
  -- 7일 이상된 실패 이벤트 삭제 (최대 재시도 횟수 초과)
  DELETE FROM public.webhook_events
  WHERE status = 'failed' 
    AND retry_count >= max_retries
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_count := v_deleted_count + v_temp_count;
  
  -- 취소된 이벤트 삭제 (1일 이상된 것)
  DELETE FROM public.webhook_events
  WHERE status = 'cancelled'
    AND created_at < NOW() - INTERVAL '1 day';
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_count := v_deleted_count + v_temp_count;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 정책 설정
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 관리자만 웹훅 이벤트 조회 가능
CREATE POLICY "관리자만 웹훅 이벤트 조회 가능" ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템 함수만 웹훅 이벤트 생성/수정 가능
CREATE POLICY "시스템 함수만 웹훅 이벤트 생성 가능" ON public.webhook_events
  FOR INSERT WITH CHECK (false);

CREATE POLICY "시스템 함수만 웹훅 이벤트 수정 가능" ON public.webhook_events
  FOR UPDATE USING (false);

-- 권한 설정
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_webhook_event(VARCHAR, JSONB, VARCHAR, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_webhook_event_status(UUID, VARCHAR, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_webhook_events_for_retry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_events() TO authenticated;

-- 트랜잭션 커밋
COMMIT;

-- 테이블 및 함수 코멘트 추가
COMMENT ON TABLE public.webhook_events IS '웹훅 이벤트 로깅 및 재시도 관리 테이블';
COMMENT ON COLUMN public.webhook_events.event_type IS '이벤트 타입 (booking.extended, coupon.granted 등)';
COMMENT ON COLUMN public.webhook_events.event_data IS '웹훅 페이로드 전체 데이터 (JSON)';
COMMENT ON COLUMN public.webhook_events.status IS '발송 상태 (pending, sent, failed, cancelled)';
COMMENT ON COLUMN public.webhook_events.retry_count IS '현재까지 재시도한 횟수';
COMMENT ON COLUMN public.webhook_events.next_retry_at IS '다음 재시도 예정 시간 (지수 백오프)';

COMMENT ON FUNCTION public.create_webhook_event IS '새로운 웹훅 이벤트 생성';
COMMENT ON FUNCTION public.update_webhook_event_status IS '웹훅 이벤트 상태 업데이트 (발송 결과 반영)';
COMMENT ON FUNCTION public.get_webhook_events_for_retry IS '재시도 대상 웹훅 이벤트 조회';
COMMENT ON FUNCTION public.cleanup_old_webhook_events IS '오래된 웹훅 이벤트 정리 (자동화 스케줄러용)'; 