// 관리자 계정 생성 스크립트
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 anon key 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 서비스 롤 키 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

// 서비스 롤 권한으로 Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  const adminEmail = 'admin@pronto.co.kr';
  const adminPassword = 'admin1234!'; // 임시 비밀번호, 실제로는 더 강력한 것을 사용해야 함
  
  try {
    // 1. 사용자 생성
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // 이메일 확인 완료로 설정
    });
    
    if (userError) {
      console.error('사용자 생성 오류:', userError.message);
      return;
    }
    
    console.log('사용자 생성 성공:', userData);
    
    // 2. customers 테이블에 관리자 역할 설정
    const { error: customerError } = await supabase
      .from('customers')
      .upsert({
        id: userData.user.id,
        email: adminEmail,
        role: 'admin',
        auth_provider: 'email',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    
    if (customerError) {
      console.error('고객 정보 추가 오류:', customerError.message);
      return;
    }
    
    console.log('관리자 계정 생성 완료: admin@pronto.co.kr');
    console.log('임시 비밀번호:', adminPassword);
  } catch (error) {
    console.error('예외 발생:', error);
  }
}

createAdminUser(); 