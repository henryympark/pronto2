"use client";

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect } from 'react';

// 환경 변수에서 Supabase URL과 anon key를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 백업 값 (개발 환경에서만 사용)
const BACKUP_SUPABASE_URL = 'https://plercperpovsdoprkyow.supabase.co';
const BACKUP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZXJjcGVycG92c2RvcHJreW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDgxMDgsImV4cCI6MjA2MjE4NDEwOH0.kwEENt9W15rNM1DMTznbhyB6RPObgY6YmwvUdTk6xUw';

// 유효한 URL과 키 결정
const finalSupabaseUrl = supabaseUrl || BACKUP_SUPABASE_URL;
const finalSupabaseAnonKey = supabaseAnonKey || BACKUP_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않았다면 경고를 표시합니다.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL 또는 anon key가 .env.local에 올바르게 설정되지 않았습니다. 백업 값을 사용합니다.');
}

// 🔧 미들웨어와 동일한 쿠키 이름 사용 - SSR 호환성 강화
const SUPABASE_AUTH_TOKEN_KEY = 'supabase-auth-token';
const SUPABASE_REFRESH_TOKEN_KEY = 'supabase-refresh-token';

// 🔧 개선된 쿠키 처리 유틸리티 함수 - 미들웨어 완전 호환
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  
  try {
    // 🔍 디버깅 로그 추가
    if (process.env.NODE_ENV === 'development') {
      console.log(`[클라이언트 쿠키] ${name} 읽기 시도`);
    }
    
    const cookies = document.cookie.split(/;\s*/);
    for (const cookie of cookies) {
      if (cookie.indexOf(`${name}=`) === 0) {
        const value = decodeURIComponent(cookie.substring(name.length + 1));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[클라이언트 쿠키] ${name} 읽기 성공, 길이: ${value.length}`);
        }
        
        return value;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[클라이언트 쿠키] ${name} 찾을 수 없음`);
    }
    
    return '';
  } catch (error) {
    console.error('[클라이언트 쿠키] 파싱 오류:', error);
    return '';
  }
};

const setCookie = (name: string, value: string, options: any = {}) => {
  if (typeof document === 'undefined') return;
  
  try {
    // 🔧 미들웨어와 완전히 동일한 쿠키 설정
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    const defaultOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1년
      // 🔧 미들웨어와 동일: localhost에서는 domain 설정 안함
      ...(isLocalhost ? {} : { domain: window.location.hostname }),
      secure: window.location.protocol === 'https:',
      sameSite: 'lax', // 🔧 미들웨어와 동일: lax로 설정
      httpOnly: false // 🔧 클라이언트에서 접근 가능하도록 설정
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    // 모든 옵션 추가 (미들웨어와 동일한 순서)
    if (finalOptions.path) cookieString += `; path=${finalOptions.path}`;
    if (finalOptions.maxAge) cookieString += `; max-age=${finalOptions.maxAge}`;
    if (finalOptions.domain) cookieString += `; domain=${finalOptions.domain}`;
    if (finalOptions.secure) cookieString += '; secure';
    if (finalOptions.sameSite) cookieString += `; samesite=${finalOptions.sameSite}`;
    if (finalOptions.httpOnly) cookieString += '; httponly';
    
    document.cookie = cookieString;
    
    // 🔍 디버깅 로그 - 미들웨어와 동일한 형식
    if (process.env.NODE_ENV === 'development') {
      console.log(`[클라이언트 쿠키] ${name} 설정 완료:`, {
        valueLength: value.length,
        domain: finalOptions.domain || '(기본값)',
        secure: finalOptions.secure,
        sameSite: finalOptions.sameSite,
        httpOnly: finalOptions.httpOnly
      });
      
      // 🔍 설정 후 즉시 읽기 테스트
      const readBack = getCookie(name);
      console.log(`[클라이언트 쿠키] ${name} 읽기 테스트:`, {
        success: readBack.length > 0,
        length: readBack.length
      });
    }
    
  } catch (error) {
    console.error('[클라이언트 쿠키] 설정 오류:', error);
  }
};

const removeCookie = (name: string, options: any = {}) => {
  if (typeof document === 'undefined') return;
  
  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    const defaultOptions = {
      path: '/',
      ...(isLocalhost ? {} : { domain: window.location.hostname }),
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // 쿠키 만료 (미들웨어와 동일한 방식)
    document.cookie = `${name}=; max-age=0${
      finalOptions.path ? `; path=${finalOptions.path}` : ''
    }${finalOptions.domain ? `; domain=${finalOptions.domain}` : ''}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[클라이언트 쿠키] ${name} 삭제 완료`);
    }
    
  } catch (error) {
    console.error('[클라이언트 쿠키] 삭제 오류:', error);
  }
};

// 🔧 미들웨어와 완전히 호환되는 Supabase 클라이언트 설정
const supabaseClient = createBrowserClient(
  finalSupabaseUrl, 
  finalSupabaseAnonKey,
  {
    cookies: {
      get: getCookie,
      set: setCookie,
      remove: removeCookie,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: process.env.NODE_ENV === 'development',
      // 🔧 미들웨어와 동일한 storage key 사용
      storageKey: 'supabase.auth.token',
      // 🔧 SSR 호환성 강화 - localStorage와 쿠키 병행 사용
      storage: typeof window !== 'undefined' ? {
        getItem: (key: string) => {
          // 먼저 쿠키에서 시도, 없으면 localStorage에서
          const cookieValue = getCookie(key);
          if (cookieValue) {
            return cookieValue;
          }
          return window.localStorage.getItem(key);
        },
        setItem: (key: string, value: string) => {
          // localStorage와 쿠키 모두에 저장
          window.localStorage.setItem(key, value);
          setCookie(key, value);
        },
        removeItem: (key: string) => {
          // localStorage와 쿠키 모두에서 제거
          window.localStorage.removeItem(key);
          removeCookie(key);
        },
      } : undefined,
    },
    global: {
      headers: {
        'X-Client-Info': `pronto-web/1.0.0`,
        'X-Client-Platform': 'browser',
      },
    }
  }
);

// Supabase Client 사용 가능한지 확인
if (supabaseClient) {
  console.log('Supabase 클라이언트 초기화 성공');
} else {
  console.error('Supabase 클라이언트 초기화 실패');
}

// Supabase Context 타입 정의
type SupabaseContextType = {
  supabase: SupabaseClient;
};

// Context 생성
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Provider 컴포넌트
export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  // 컴포넌트 마운트 시 세션 복구 시도
  useEffect(() => {
    const recoverSession = async () => {
      try {
        // 🔍 쿠키 디버깅 정보 출력
        if (process.env.NODE_ENV === 'development') {
          const allCookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
          const supabaseCookies = allCookies.filter(name => 
            name.includes('sb-') || name.includes('supabase')
          );
          console.log('[SupabaseProvider] 현재 쿠키:', {
            allCookies: allCookies.length,
            supabaseCookies,
            cookieString: document.cookie
          });
        }
        
        // 세션 복구 시도
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.warn('SupabaseProvider: 세션 복구 오류', error);
        } else if (data.session) {
          console.log('SupabaseProvider: 세션 복구 성공');
        } else {
          console.log('SupabaseProvider: 세션 없음');
        }
      } catch (e) {
        console.error('SupabaseProvider: 세션 복구 중 예외 발생', e);
      }
    };
    
    recoverSession();
    
    // 네트워크 상태 변경 시 세션 상태 확인
    const handleOnline = () => {
      console.log('SupabaseProvider: 네트워크 연결됨, 세션 복구 시도');
      recoverSession();
    };
    
    window.addEventListener('online', handleOnline);
    
    // 포커스 변경 시 세션 확인 (다른 탭에서 로그인/로그아웃 한 경우)
    const handleFocus = () => {
      console.log('SupabaseProvider: 창 포커스, 세션 상태 확인');
      recoverSession();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  return (
    <SupabaseContext.Provider value={{ supabase: supabaseClient }}>
      {children}
    </SupabaseContext.Provider>
  );
};

// 사용을 위한 커스텀 Hook
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context.supabase;
};