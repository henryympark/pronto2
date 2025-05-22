import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 anon key를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않았을 경우 콘솔에 경고를 표시하고 백업 URL과 키를 사용합니다.
// 실제 프로덕션 환경에서는 이렇게 하면 안 되지만, 개발 환경에서 문제 해결을 위한 임시 방법입니다.
const BACKUP_SUPABASE_URL = 'https://plercperpovsdoprkyow.supabase.co';
const BACKUP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZXJjcGVycG92c2RvcHJreW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDgxMDgsImV4cCI6MjA2MjE4NDEwOH0.kwEENt9W15rNM1DMTznbhyB6RPObgY6YmwvUdTk6xUw';

// 유효한 URL과 키 결정
const finalSupabaseUrl = supabaseUrl || BACKUP_SUPABASE_URL;
const finalSupabaseAnonKey = supabaseAnonKey || BACKUP_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않았다면 경고를 표시합니다.
if (typeof window === 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Supabase URL 또는 anon key가 .env.local에 올바르게 설정되지 않았습니다. 백업 값을 사용합니다.');
}

// 싱글톤 인스턴스 관리를 위한 타입 선언
declare global {
  interface Window {
    __SUPABASE_SINGLETON_INSTANCE?: SupabaseClient;
  }
}

// 서버에서 사용할 인스턴스 저장 변수 - 서버 환경에서만 초기화
if (typeof window === 'undefined' && typeof global !== 'undefined' && !global.__SUPABASE_SERVER_INSTANCE) {
  // @ts-expect-error - global 타입 확장
  global.__SUPABASE_SERVER_INSTANCE = null;
}

// 서버 사이드 Supabase 클라이언트 인스턴스 (싱글톤) - 서버 환경에서만 사용
let serverSideInstance: SupabaseClient | null = null;

// 클라이언트 사이드 인스턴스 참조 (SupabaseContext와 공유)
const clientSideInstance: { current: SupabaseClient | null } = { current: null };

/**
 * 서버 사이드에서만 사용할 Supabase 클라이언트를 생성합니다.
 * 클라이언트 사이드에서는 contexts/SupabaseContext.tsx의 useSupabase 훅을 사용해야 합니다.
 */
export const createSupabaseServerClient = (): SupabaseClient => {
  // 서버 사이드 환경인지 확인
  if (typeof window !== 'undefined') {
    console.warn(
      '[경고] 클라이언트 컴포넌트에서 createSupabaseServerClient()를 호출했습니다. ' +
      '대신 contexts/SupabaseContext.tsx의 useSupabase() 훅을 사용하는 것이 좋습니다.'
    );
    
    // 클라이언트에서 호출된 경우 클라이언트 인스턴스 제공
    if (window.__SUPABASE_SINGLETON_INSTANCE) {
      return window.__SUPABASE_SINGLETON_INSTANCE;
    }
    
    if (clientSideInstance.current) {
      return clientSideInstance.current;
    }
    
    // 경고 표시 후 신규 생성은 하지 않고 SupabaseContext를 사용하도록 안내
    console.error(
      '클라이언트 컴포넌트에서는 반드시 useSupabase() 훅을 사용해야 합니다.\n' +
      '예: const supabase = useSupabase();\n' +
      '이 함수는 서버 컴포넌트에서만 사용해야 합니다.'
    );
    
    // 임시 dummy 인스턴스 반환 대신 존재하는 인스턴스나 새로 만든 인스턴스 반환
    // 에러를 throw하지 않고 기능 제한된 클라이언트 반환
    return (window.__SUPABASE_SINGLETON_INSTANCE = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }));
  }

  // 서버 사이드 방식으로 전역 인스턴스 확인 (Next.js의 서버 컴포넌트 지원)
  if (typeof global !== 'undefined' && global.__SUPABASE_SERVER_INSTANCE) {
    // @ts-expect-error - global 타입 확장
    return global.__SUPABASE_SERVER_INSTANCE;
  }

  // 서버 사이드 싱글톤 인스턴스 재사용
  if (serverSideInstance !== null) {
    return serverSideInstance;
  }

  // 새 서버 사이드 인스턴스 생성
  serverSideInstance = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
    auth: {
      persistSession: false, // 서버에서는 세션 유지 안 함
      autoRefreshToken: false,
    }
  });

  // 전역 객체에 저장 (Next.js 서버 컴포넌트 지원)
  if (typeof global !== 'undefined') {
    // @ts-expect-error - global 타입 확장
    global.__SUPABASE_SERVER_INSTANCE = serverSideInstance;
  }

  return serverSideInstance;
};

/**
 * @deprecated 기존 코드와의 호환성을 위해 남겨둔 함수입니다.
 * 클라이언트 컴포넌트에서는 useSupabase() 훅을 사용하고,
 * 서버 컴포넌트에서는 createSupabaseServerClient()를 사용하세요.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (typeof window !== 'undefined') {
    console.warn(
      '[경고] getSupabaseClient() 함수는 더 이상 사용하지 않는 것이 좋습니다. ' +
      '클라이언트 컴포넌트에서는 contexts/SupabaseContext.tsx의 useSupabase() 훅을 사용하세요.'
    );
    
    // 클라이언트에서 호출된 경우 window 전역 인스턴스 사용
    if (typeof window.__SUPABASE_SINGLETON_INSTANCE !== 'undefined') {
      return window.__SUPABASE_SINGLETON_INSTANCE;
    }
    
    // 모듈 레벨 인스턴스 확인
    if (clientSideInstance.current) {
      return clientSideInstance.current;
    }
    
    // 안내 메시지만 표시하고 서버 인스턴스 반환
    console.log('클라이언트 인스턴스가 없어 서버 인스턴스를 제공합니다. useSupabase() 훅 사용을 권장합니다.');
  }
  
  return createSupabaseServerClient();
};

/**
 * @deprecated 기존 코드와의 호환성을 위해 남겨둔 함수입니다.
 * 클라이언트 컴포넌트에서는 useSupabase() 훅을 사용하세요.
 */
export const createClient$ = getSupabaseClient;

// 서버 컴포넌트에서 사용하기 위한 클라이언트 인스턴스 - 서버 환경에서만 자동 생성
let supabaseServer: SupabaseClient;

// 서버 환경에서만 즉시 생성
if (typeof window === 'undefined') {
  supabaseServer = createSupabaseServerClient();
}

export { supabaseServer }; 