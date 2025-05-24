// src/lib/supabase.ts
// Supabase 클라이언트 관리 - TypeScript 에러 수정 완료

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =================================
// 환경 변수 및 백업 설정
// =================================

// 환경 변수에서 Supabase URL과 anon key를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않았을 경우 백업 URL과 키를 사용합니다.
// 주의: 실제 프로덕션 환경에서는 환경 변수를 올바르게 설정해야 합니다.
const BACKUP_SUPABASE_URL = 'https://plercperpovsdoprkyow.supabase.co';
const BACKUP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZXJjcGVycG92c2RvcHJreW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDgxMDgsImV4cCI6MjA2MjE4NDEwOH0.kwEENt9W15rNM1DMTznbhyB6RPObgY6YmwvUdTk6xUw';

// 유효한 URL과 키 결정
const finalSupabaseUrl = supabaseUrl || BACKUP_SUPABASE_URL;
const finalSupabaseAnonKey = supabaseAnonKey || BACKUP_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않았다면 경고를 표시합니다.
if (typeof window === 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Supabase URL 또는 anon key가 .env.local에 올바르게 설정되지 않았습니다. 백업 값을 사용합니다.');
}

// =================================
// 타입 확장 (전역 객체)
// =================================

// 싱글톤 인스턴스 관리를 위한 타입 선언
declare global {
  interface Window {
    __SUPABASE_SINGLETON_INSTANCE?: SupabaseClient;
  }
  
  // Node.js 전역 객체 확장
  var __SUPABASE_SERVER_INSTANCE: SupabaseClient | null | undefined;
}

// =================================
// 서버/클라이언트 인스턴스 관리
// =================================

// 서버에서 사용할 인스턴스 저장 변수 초기화
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  if (!globalThis.__SUPABASE_SERVER_INSTANCE) {
    globalThis.__SUPABASE_SERVER_INSTANCE = null;
  }
}

// 서버 사이드 Supabase 클라이언트 인스턴스 (싱글톤)
let serverSideInstance: SupabaseClient | null = null;

// 클라이언트 사이드 인스턴스 참조 (SupabaseContext와 공유)
const clientSideInstance: { current: SupabaseClient | null } = { current: null };

// =================================
// 서버 클라이언트 생성 함수
// =================================

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
    
    // 경고 표시 후 새 인스턴스 생성
    console.error(
      '클라이언트 컴포넌트에서는 반드시 useSupabase() 훅을 사용해야 합니다.\n' +
      '예: const supabase = useSupabase();\n' +
      '이 함수는 서버 컴포넌트에서만 사용해야 합니다.'
    );
    
    // 클라이언트용 인스턴스 생성
    const clientInstance = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    
    window.__SUPABASE_SINGLETON_INSTANCE = clientInstance;
    return clientInstance;
  }

  // 서버 사이드 전역 인스턴스 확인
  if (typeof globalThis !== 'undefined' && globalThis.__SUPABASE_SERVER_INSTANCE) {
    return globalThis.__SUPABASE_SERVER_INSTANCE;
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

  // 전역 객체에 저장
  if (typeof globalThis !== 'undefined') {
    globalThis.__SUPABASE_SERVER_INSTANCE = serverSideInstance;
  }

  return serverSideInstance;
};

// =================================
// 호환성을 위한 함수들
// =================================

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
    if (window.__SUPABASE_SINGLETON_INSTANCE) {
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

// =================================
// 서버 컴포넌트용 인스턴스 export
// =================================

// 서버 컴포넌트에서 사용하기 위한 클라이언트 인스턴스
let supabaseServer: SupabaseClient;

// 서버 환경에서만 즉시 생성
if (typeof window === 'undefined') {
  supabaseServer = createSupabaseServerClient();
}

// Non-null assertion을 사용하여 TypeScript에게 런타임에 정의됨을 알림
export { supabaseServer };

// =================================
// 클라이언트 사이드 헬퍼 함수들
// =================================

/**
 * 클라이언트 사이드에서 Supabase 인스턴스 설정 (SupabaseContext에서 사용)
 * @param instance - 설정할 Supabase 인스턴스
 */
export const setClientSideInstance = (instance: SupabaseClient): void => {
  if (typeof window !== 'undefined') {
    clientSideInstance.current = instance;
    window.__SUPABASE_SINGLETON_INSTANCE = instance;
  }
};

/**
 * 현재 클라이언트 사이드 인스턴스 가져오기
 * @returns 클라이언트 사이드 Supabase 인스턴스 또는 null
 */
export const getClientSideInstance = (): SupabaseClient | null => {
  if (typeof window !== 'undefined') {
    return window.__SUPABASE_SINGLETON_INSTANCE || clientSideInstance.current || null;
  }
  return null;
};

/**
 * Supabase 클라이언트 인스턴스 정리 (로그아웃 시 사용)
 */
export const clearSupabaseInstances = (): void => {
  if (typeof window !== 'undefined') {
    delete window.__SUPABASE_SINGLETON_INSTANCE;
    clientSideInstance.current = null;
  }
  
  // 서버 인스턴스는 정리하지 않음 (다른 요청에서 재사용)
};

// =================================
// 환경 정보 유틸리티
// =================================

/**
 * 현재 Supabase 설정 정보 반환 (디버깅용)
 */
export const getSupabaseConfig = () => {
  return {
    url: finalSupabaseUrl,
    hasAnonymousKey: !!finalSupabaseAnonKey,
    isUsingBackup: !supabaseUrl || !supabaseAnonKey,
    environment: process.env.NODE_ENV,
    isServer: typeof window === 'undefined'
  };
};

/**
 * Supabase 연결 상태 확인
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const client = typeof window === 'undefined' 
      ? createSupabaseServerClient() 
      : getClientSideInstance();
      
    if (!client) {
      return false;
    }
    
    // 간단한 연결 테스트
    const { error } = await client.auth.getSession();
    return !error;
  } catch (error) {
    console.error('Supabase 연결 확인 실패:', error);
    return false;
  }
};

// =================================
// 디버깅 정보 (개발 환경에서만)
// =================================

if (process.env.NODE_ENV === 'development') {
  // 개발 환경에서 Supabase 설정 정보 출력
  if (typeof window === 'undefined') {
    console.log('[Supabase] 서버 사이드 설정:', getSupabaseConfig());
  } else {
    console.log('[Supabase] 클라이언트 사이드 설정:', getSupabaseConfig());
  }
}