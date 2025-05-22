-- Add function to check if columns exist in a table
-- 테이블이 존재하는 경우에만 수정하는 idempotent 방식 적용

-- 트랜잭션 시작
BEGIN;

-- 컬럼 존재 여부를 확인하는 함수 생성
CREATE OR REPLACE FUNCTION public.check_columns_exist(
  p_table_name TEXT,
  p_column_names TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_column_name TEXT;
  v_exists BOOLEAN := TRUE;
  v_column_exists BOOLEAN;
  v_missing_columns TEXT[] := '{}';
BEGIN
  -- 각 컬럼에 대해 존재 여부 확인
  FOREACH v_column_name IN ARRAY p_column_names
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = v_column_name
    ) INTO v_column_exists;
    
    -- 하나라도 없으면 전체 결과는 false
    IF NOT v_column_exists THEN
      v_exists := FALSE;
      v_missing_columns := array_append(v_missing_columns, v_column_name);
    END IF;
  END LOOP;
  
  -- 결과 JSON 생성
  v_result := json_build_object(
    'all_exist', v_exists,
    'missing_columns', v_missing_columns
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수에 대한 접근 권한 설정
GRANT EXECUTE ON FUNCTION public.check_columns_exist TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_columns_exist TO service_role;

-- 커밋
COMMIT; 