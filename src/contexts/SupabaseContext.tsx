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

// 쿠키 처리 유틸리티 함수 - 성능 및 안정성 개선
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  
  try {
    // 쿠키 문자열을 배열로 분할하여 검색
    const cookies = document.cookie.split(/;\s*/);
    for (const cookie of cookies) {
      if (cookie.indexOf(`${name}=`) === 0) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }
    return '';
  } catch (error) {
    console.error('쿠키 파싱 오류:', error);
    return '';
  }
};

const setCookie = (name: string, value: string, options: any = {}) => {
  if (typeof document === 'undefined') return;
  
  try {
    const defaultOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1년
      domain: window.location.hostname,
      secure: window.location.protocol === 'https:',
      sameSite: 'lax'
    };
    
    // 기본 옵션과 사용자 옵션 병합
    const finalOptions = { ...defaultOptions, ...options };
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    // 모든 옵션 추가
    if (finalOptions.path) cookieString += `; path=${finalOptions.path}`;
    if (finalOptions.maxAge) cookieString += `; max-age=${finalOptions.maxAge}`;
    if (finalOptions.domain) cookieString += `; domain=${finalOptions.domain}`;
    if (finalOptions.secure) cookieString += '; secure';
    if (finalOptions.sameSite) cookieString += `; samesite=${finalOptions.sameSite}`;
    
    document.cookie = cookieString;
    
    // 로컬 스토리지에도 백업 저장
    try {
      localStorage.setItem(`cookie_backup_${name}`, value);
    } catch (e) {
      // 로컬 스토리지 오류 무시
    }
  } catch (error) {
    console.error('쿠키 설정 오류:', error);
  }
};

const removeCookie = (name: string, options: any = {}) => {
  if (typeof document === 'undefined') return;
  
  try {
    const defaultOptions = {
      path: '/',
      domain: window.location.hostname,
    };
    
    // 기본 옵션과 사용자 옵션 병합
    const finalOptions = { ...defaultOptions, ...options };
    
    // 쿠키 만료
    document.cookie = `${name}=; max-age=0${
      finalOptions.path ? `; path=${finalOptions.path}` : ''
    }; domain=${finalOptions.domain || window.location.hostname}`;
    
    // 로컬 스토리지 백업도 제거
    try {
      localStorage.removeItem(`cookie_backup_${name}`);
    } catch (e) {
      // 로컬 스토리지 오류 무시
    }
  } catch (error) {
    console.error('쿠키 삭제 오류:', error);
  }
};

// 모듈 레벨에서 단일 인스턴스 생성
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
      debug: true,  // 디버깅 활성화
      storageKey: 'supabase.auth.token',  // 토큰 저장 키 명시적 지정
    },
    global: {
      headers: {
        'X-Client-Info': `pronto-web/${'1.0.0'}`,
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
        // 세션 복구 시도
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.warn('SupabaseProvider: 세션 복구 오류', error);
          
          // 로컬 스토리지에서 토큰 정보 확인
          try {
            const hasTokenInStorage = localStorage.getItem('supabase.auth.token');
            if (hasTokenInStorage) {
              console.log('SupabaseProvider: 로컬 스토리지에 토큰 존재, 세션 복구 다시 시도');
              await supabaseClient.auth.refreshSession();
            }
          } catch (storageErr) {
            console.error('SupabaseProvider: 스토리지 확인 중 오류', storageErr);
          }
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