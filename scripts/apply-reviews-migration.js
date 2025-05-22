import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { dirname } from 'path';

// ES 모듈에서 __dirname 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local 파일 로드
config({ path: '.env.local' });

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
  process.exit(1);
}

// Supabase 클라이언트 생성 (service role 키 사용)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    // 마이그레이션 SQL 파일 읽기
    const migrationPath = path.join(__dirname, '../supabase/migrations/0013_create_reviews_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('리뷰 테이블 마이그레이션을 적용합니다...');
    
    // SQL 실행
    const { error } = await supabase.rpc('pgmoon.query', { query: migrationSql });
    
    if (error) {
      if (error.message.includes('function "pgmoon.query" does not exist')) {
        console.error('pgmoon.query 함수가 없습니다. 대신 일반 쿼리를 시도합니다.');
        
        // 마이그레이션 SQL을 여러 명령으로 분할
        const sqlCommands = migrationSql.split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0);
        
        for (const cmd of sqlCommands) {
          console.log(`실행 중: ${cmd.substring(0, 100)}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: cmd });
          
          if (error) {
            if (error.message.includes('function "exec_sql" does not exist')) {
              console.error('SQL을 직접 실행할 수 없습니다. Supabase 대시보드에서 SQL 에디터를 사용해주세요.');
              console.log('마이그레이션 SQL:');
              console.log(migrationSql);
              break;
            } else {
              console.error('SQL 실행 오류:', error.message);
            }
          }
        }
      } else {
        console.error('마이그레이션 적용 오류:', error.message);
      }
    } else {
      console.log('리뷰 테이블 마이그레이션이 성공적으로 적용되었습니다!');
    }
  } catch (error) {
    console.error('마이그레이션 적용 중 오류 발생:', error);
  }
}

applyMigration(); 