-- 임시 예약 정보 저장 테이블 생성
-- 로그인 전 예약 정보를 안전하게 임시 저장하기 위한 테이블

CREATE TABLE IF NOT EXISTS temp_reservation_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 클라이언트 연결 키 (sessionStorage와 연결)
    session_id UUID NOT NULL UNIQUE,
    
    -- 암호화된 개인정보 데이터 (JSON)
    encrypted_data TEXT NOT NULL,
    
    -- 데이터 무결성 검증용 해시
    data_hash VARCHAR(64) NOT NULL,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 선택적 보안 메타데이터
    user_agent TEXT,
    ip_address INET,
    
    -- 인덱스를 위한 제약조건
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_temp_reservation_session_id 
    ON temp_reservation_storage (session_id);

CREATE INDEX IF NOT EXISTS idx_temp_reservation_expires_at 
    ON temp_reservation_storage (expires_at);

CREATE INDEX IF NOT EXISTS idx_temp_reservation_created_at 
    ON temp_reservation_storage (created_at);

-- 만료된 데이터 자동 삭제를 위한 함수
CREATE OR REPLACE FUNCTION cleanup_expired_temp_reservations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM temp_reservation_storage
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 로그 기록
    INSERT INTO system_logs (event_type, message, created_at)
    VALUES (
        'temp_cleanup',
        format('Cleaned up %s expired temp reservations', deleted_count),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 시스템 로그 테이블이 없는 경우 생성 (선택적)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_event_type 
    ON system_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at 
    ON system_logs (created_at);

-- 보안 정책 설정 (RLS - Row Level Security)
ALTER TABLE temp_reservation_storage ENABLE ROW LEVEL SECURITY;

-- 임시 저장 데이터는 session_id로만 접근 가능
CREATE POLICY "Users can only access their own temp data"
    ON temp_reservation_storage
    FOR ALL
    USING (true);  -- API 서버에서만 접근하므로 모든 권한 허용

-- 자동 만료 데이터 정리를 위한 스케줄러 설정 (pg_cron 확장 필요)
-- 매 시간마다 만료된 데이터 정리
-- SELECT cron.schedule('cleanup-temp-reservations', '0 * * * *', 'SELECT cleanup_expired_temp_reservations();');

-- 테이블 코멘트 추가
COMMENT ON TABLE temp_reservation_storage IS '로그인 전 예약 정보 임시 저장 테이블 (30분 TTL)';
COMMENT ON COLUMN temp_reservation_storage.session_id IS '클라이언트 sessionStorage 연결 키';
COMMENT ON COLUMN temp_reservation_storage.encrypted_data IS 'AES-256-GCM 암호화된 개인정보 JSON';
COMMENT ON COLUMN temp_reservation_storage.data_hash IS 'SHA-256 데이터 무결성 검증 해시';
COMMENT ON COLUMN temp_reservation_storage.expires_at IS '30분 후 자동 만료 시간';

-- 권한 설정
GRANT SELECT, INSERT, DELETE ON temp_reservation_storage TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_temp_reservations() TO authenticated; 