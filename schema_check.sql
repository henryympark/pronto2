-- reservations 테이블의 컬럼 정보 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'reservations' 
  AND table_schema = 'public'
ORDER BY 
  ordinal_position; 