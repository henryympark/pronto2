"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Session, User, Provider } from "@supabase/supabase-js";
import { useSupabase } from "./SupabaseContext";
import { clearRoleCache } from "@/lib/auth-utils";

// ✅ 단순화된 타입 정의
type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithKakao: () => Promise<any>;
  signInWithNaver: () => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const mountedRef = useRef(true);
  const supabase = useSupabase();
  
  // 디버깅 로그
  const debugLog = useCallback((action: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AuthContext] ${action}`, {
        ...data,
        timestamp: new Date().toISOString(),
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
      });
    }
  }, []);
  
  // ✅ 단순화된 세션 가져오기
  const getSession = useCallback(async () => {
    if (!mountedRef.current) return;
    
    debugLog('세션 가져오기 시작');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      const currentSession = data.session;
      debugLog('세션 확인 완료', { hasSession: !!currentSession });
      
      if (mountedRef.current) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false); // ✅ 명시적으로 로딩 해제
      }
      
    } catch (err) {
      debugLog('세션 가져오기 오류', { error: err });
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setSession(null);
        setUser(null);
        setLoading(false); // ✅ 에러 시에도 로딩 해제
      }
    }
  }, [supabase.auth, debugLog]);

  // ✅ 단순화된 로그아웃
  const signOut = useCallback(async () => {
    debugLog('로그아웃 시작');
    
    try {
      // 상태 먼저 클리어
      setSession(null);
      setUser(null);
      setLoading(false);
      
      // 권한 캐시 클리어
      clearRoleCache();
      
      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        debugLog('로그아웃 오류', { error: error.message });
      }
      
      debugLog('로그아웃 완료');
      
      // 로그인 페이지로 리디렉션
      if (typeof window !== 'undefined') {
        window.location.href = `/auth/login?t=${Date.now()}`;
      }
      
    } catch (error) {
      debugLog('로그아웃 예외', { error });
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [supabase.auth, debugLog]);

  // OAuth 로그인들
  const signInWithKakao = useCallback(async () => {
    debugLog('카카오 로그인 시작');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao' as Provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      debugLog('카카오 로그인 오류', { error });
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [supabase.auth, debugLog]);

  const signInWithNaver = useCallback(async () => {
    debugLog('네이버 로그인 시작');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'naver' as Provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      debugLog('네이버 로그인 오류', { error });
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [supabase.auth, debugLog]);

  // ✅ 개선된 초기화 및 상태 변경 감지
  useEffect(() => {
    debugLog('AuthProvider 마운트');
    mountedRef.current = true;
    
    // 초기 세션 가져오기
    getSession();
    
    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        debugLog('인증 상태 변경', { event, hasSession: !!newSession });
        
        if (!mountedRef.current) return;
        
        switch (event) {
          case 'SIGNED_IN':
            setSession(newSession);
            setUser(newSession?.user || null);
            setLoading(false); // ✅ 명시적으로 로딩 해제
            break;
            
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setLoading(false); // ✅ 명시적으로 로딩 해제
            clearRoleCache(); // 로그아웃 시 권한 캐시 클리어
            break;
            
          case 'TOKEN_REFRESHED':
            if (newSession) {
              setSession(newSession);
              setUser(newSession.user);
            }
            setLoading(false); // ✅ TOKEN_REFRESHED에서도 로딩 해제
            break;
            
          case 'INITIAL_SESSION': // ✅ 초기 세션 이벤트 처리
            setSession(newSession);
            setUser(newSession?.user || null);
            setLoading(false);
            break;
            
          case 'PASSWORD_RECOVERY':
            // 비밀번호 복구 시에도 로딩 해제
            setLoading(false);
            break;
            
          default:
            debugLog('알 수 없는 인증 이벤트', { event });
            setLoading(false); // ✅ 모든 경우에 로딩 해제
        }
      }
    );

    return () => {
      debugLog('AuthProvider 언마운트');
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [getSession, supabase.auth, debugLog]);

  // ✅ 로딩 타임아웃 (최대 10초 후 강제 해제)
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        if (mountedRef.current && loading) {
          debugLog('로딩 타임아웃 - 강제 해제');
          setLoading(false);
        }
      }, 10000); // 10초 타임아웃

      return () => clearTimeout(timeoutId);
    }
  }, [loading, debugLog]);

  const value: AuthContextType = {
    session,
    user,
    loading,
    error,
    signInWithKakao,
    signInWithNaver,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};