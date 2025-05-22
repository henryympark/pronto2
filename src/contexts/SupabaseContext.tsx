"use client";

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useContext } from 'react';

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

// 모듈 레벨에서 단일 인스턴스 생성
const supabaseClient = createBrowserClient(
  finalSupabaseUrl, 
  finalSupabaseAnonKey,
  {
    cookies: {
      get(name) {
        if (typeof document === 'undefined') return '';
        const cookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${name}=`));
        return cookie ? cookie.split('=')[1] : '';
      },
      set(name, value, options) {
        if (typeof document === 'undefined') return;
        let cookieString = `${name}=${value}`;
        if (options.path) {
          cookieString += `; path=${options.path}`;
        }
        if (options.maxAge) {
          cookieString += `; max-age=${options.maxAge}`;
        }
        if (options.domain) {
          cookieString += `; domain=${options.domain}`;
        }
        if (options.secure) {
          cookieString += '; secure';
        }
        if (options.sameSite) {
          cookieString += `; samesite=${options.sameSite}`;
        }
        document.cookie = cookieString;
      },
      remove(name, options) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; max-age=0${options?.path ? `; path=${options.path}` : ''}`;
      },
    },
  }
);

// Supabase Context 타입 정의
type SupabaseContextType = {
  supabase: SupabaseClient;
};

// Context 생성
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Provider 컴포넌트
export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
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