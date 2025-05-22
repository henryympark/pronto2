import { createClient } from '@supabase/supabase-js';

// 서비스 역할 클라이언트 - 관리자 권한으로 RLS 우회
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase URL 또는 서비스 역할 키가 없습니다.');
    throw new Error('환경 변수가 설정되지 않았습니다');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} 