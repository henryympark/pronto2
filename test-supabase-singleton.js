// test-supabase-singleton.js
// 이 스크립트는 Supabase 클라이언트 싱글톤 패턴이 제대로 동작하는지 테스트합니다.

require('dotenv').config({ path: '.env.local' });

// 환경 변수가 로드되었는지 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

// 글로벌 변수로 인스턴스를 추적합니다.
let globalInstance = null;

// 동일한 설정으로 3번 Supabase 클라이언트를 생성하는 함수
function createSupabaseClient() {
  // 인스턴스가 이미 존재하면 재사용
  if (globalInstance) {
    console.log('기존 인스턴스 재사용');
    return globalInstance;
  }

  // 새 인스턴스 생성
  console.log('새 Supabase 클라이언트 인스턴스 생성');
  globalInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );

  return globalInstance;
}

// 테스트 실행
async function runTest() {
  console.log('========== Supabase 클라이언트 싱글톤 패턴 테스트 ==========');
  console.log('동일한 클라이언트 인스턴스를 3번 생성 시도합니다:');
  
  // 테스트 1: 첫 번째 인스턴스 생성
  const client1 = createSupabaseClient();
  console.log('인스턴스 1 ID:', client1.constructor.name);

  // 테스트 2: 두 번째 인스턴스 생성 (캐시 활용)
  const client2 = createSupabaseClient();
  console.log('인스턴스 2 ID:', client2.constructor.name);
  console.log('인스턴스 1과 2 동일 여부:', client1 === client2);

  // 테스트 3: 세 번째 인스턴스 생성 (캐시 활용)
  const client3 = createSupabaseClient();
  console.log('인스턴스 3 ID:', client3.constructor.name);
  console.log('인스턴스 1과 3 동일 여부:', client1 === client3);

  // 인스턴스가 작동하는지 간단히 확인
  try {
    const { data, error } = await client1.auth.getSession();
    console.log('인증 세션 확인 결과:', error ? '오류 발생' : '정상 작동');
  } catch (err) {
    console.error('테스트 중 오류 발생:', err);
  }

  console.log('======================================================');
}

// 테스트 실행
runTest(); 