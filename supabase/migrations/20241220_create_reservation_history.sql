-- 예약 이력 테이블 생성
CREATE TABLE IF NOT EXISTS reservation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'created', 'modified', 'cancelled', 'completed', 'confirmed'
  action_description TEXT NOT NULL, -- 상세 설명
  old_data JSONB, -- 변경 전 데이터 (변경 시에만)
  new_data JSONB, -- 변경 후 데이터 (변경 시에만)
  performed_by UUID, -- 작업 수행자 (고객 또는 관리자)
  performed_by_type VARCHAR(20) DEFAULT 'customer', -- 'customer' 또는 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation_id ON reservation_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_history_created_at ON reservation_history(created_at DESC);

-- RLS 정책 설정
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;

-- 고객은 자신의 예약 이력만 조회 가능
CREATE POLICY "고객은 자신의 예약 이력만 조회 가능" ON reservation_history
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE customer_id = auth.uid()
    )
  );

-- 관리자는 모든 예약 이력 조회 가능
CREATE POLICY "관리자는 모든 예약 이력 조회 가능" ON reservation_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 시스템에서만 이력 생성 가능 (트리거를 통해)
CREATE POLICY "시스템에서만 이력 생성 가능" ON reservation_history
  FOR INSERT WITH CHECK (false);

-- 예약 상태 변경 시 자동으로 이력 생성하는 트리거 함수
CREATE OR REPLACE FUNCTION create_reservation_history()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로운 예약 생성 시
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reservation_history (
      reservation_id,
      action_type,
      action_description,
      new_data,
      performed_by,
      performed_by_type
    ) VALUES (
      NEW.id,
      'created',
      '예약이 생성되었습니다.',
      to_jsonb(NEW),
      NEW.customer_id,
      'customer'
    );
    RETURN NEW;
  END IF;

  -- 예약 수정 시
  IF TG_OP = 'UPDATE' THEN
    DECLARE
      action_desc TEXT;
      action_type_val VARCHAR(50);
      performer_type VARCHAR(20) := 'customer';
    BEGIN
      -- 상태 변경에 따른 액션 타입과 설명 결정
      IF OLD.status != NEW.status THEN
        CASE NEW.status
          WHEN 'confirmed' THEN
            action_type_val := 'confirmed';
            action_desc := '예약이 확정되었습니다.';
          WHEN 'modified' THEN
            action_type_val := 'modified';
            action_desc := '예약이 변경되었습니다.';
          WHEN 'cancelled' THEN
            action_type_val := 'cancelled';
            action_desc := '예약이 취소되었습니다.';
          WHEN 'completed' THEN
            action_type_val := 'completed';
            action_desc := '예약이 완료되었습니다.';
          ELSE
            action_type_val := 'modified';
            action_desc := '예약 정보가 수정되었습니다.';
        END CASE;
      ELSE
        action_type_val := 'modified';
        action_desc := '예약 정보가 수정되었습니다.';
      END IF;

      -- 시간이나 날짜 변경 시 상세 설명 추가
      IF OLD.reservation_date != NEW.reservation_date OR 
         OLD.start_time != NEW.start_time OR 
         OLD.end_time != NEW.end_time THEN
        action_desc := action_desc || ' (날짜/시간 변경)';
      END IF;

      -- 가격 변경 시 상세 설명 추가
      IF OLD.total_price != NEW.total_price THEN
        action_desc := action_desc || ' (가격 변경: ' || OLD.total_price || '원 → ' || NEW.total_price || '원)';
      END IF;

      INSERT INTO reservation_history (
        reservation_id,
        action_type,
        action_description,
        old_data,
        new_data,
        performed_by,
        performed_by_type
      ) VALUES (
        NEW.id,
        action_type_val,
        action_desc,
        to_jsonb(OLD),
        to_jsonb(NEW),
        NEW.customer_id,
        performer_type
      );
    END;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS reservation_history_trigger ON reservations;
CREATE TRIGGER reservation_history_trigger
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION create_reservation_history(); 