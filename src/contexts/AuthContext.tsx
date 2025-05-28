"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Session, User, Provider } from "@supabase/supabase-js";
import { useSupabase } from "./SupabaseContext";
import { clearRoleCache } from "@/domains/auth";
import { AuthUser, UserRole } from "@/types";

// ✅ JWT metadata 기반 권한 관리를 포함한 타입 정의
type AuthContextType = {
  session: Session | null;
  user: User | null;
  authUser: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
  signInWithKakao: () => Promise<any>;
  signInWithNaver: () => Promise<any>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const mountedRef = useRef(true);
  const supabase = useSupabase();
  
  // 관리자 권한 확인 (JWT metadata 기반)
  const isAdmin = authUser?.role === 'admin';
  
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

  // ✅ 최적화된 사용자 정보 새로고침 (JWT metadata만 사용)
  const refreshUser = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // JWT 토큰에서 모든 정보 추출 (DB 조회 없음)
        const role = currentUser.user_metadata?.role || 'customer';
        const nickname = currentUser.user_metadata?.name || currentUser.user_metadata?.nickname;

        const authUserData: AuthUser = {
          id: currentUser.id,
          email: currentUser.email || '',
          role: role as UserRole,
          nickname: nickname,
        };

        setAuthUser(authUserData);
        debugLog('사용자 정보 새로고침 완료 (JWT만 사용)', { 
          userId: currentUser.id, 
          role: role,
          nickname: nickname,
          source: 'JWT_metadata'
        });
      } else {
        setAuthUser(null);
      }
    } catch (error) {
      debugLog('사용자 정보 새로고침 오류', { error });
      setUser(null);
      setAuthUser(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [supabase, debugLog]);
  
  // ✅ 빠른 세션 가져오기
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
        
        if (currentSession?.user) {
          // JWT에서 즉시 사용자 정보 추출 (비동기 없음)
          const role = currentSession.user.user_metadata?.role || 'customer';
          const nickname = currentSession.user.user_metadata?.name || currentSession.user.user_metadata?.nickname;

          const authUserData: AuthUser = {
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            role: role as UserRole,
            nickname: nickname,
          };

          setUser(currentSession.user);
          setAuthUser(authUserData);
          setLoading(false);
          
          debugLog('즉시 사용자 정보 설정 완료', { 
            userId: currentSession.user.id, 
            role: role,
            source: 'session_JWT'
          });
        } else {
          setUser(null);
          setAuthUser(null);
          setLoading(false);
        }
      }
      
    } catch (err) {
      debugLog('세션 가져오기 오류', { error: err });
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setSession(null);
        setUser(null);
        setAuthUser(null);
        setLoading(false);
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
      setAuthUser(null);
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

  // ✅ 최적화된 초기화 및 상태 변경 감지
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
            if (newSession?.user) {
              // JWT에서 즉시 사용자 정보 추출
              const role = newSession.user.user_metadata?.role || 'customer';
              const nickname = newSession.user.user_metadata?.name || newSession.user.user_metadata?.nickname;

              const authUserData: AuthUser = {
                id: newSession.user.id,
                email: newSession.user.email || '',
                role: role as UserRole,
                nickname: nickname,
              };

              setUser(newSession.user);
              setAuthUser(authUserData);
              setLoading(false);
            }
            break;
            
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setAuthUser(null);
            setLoading(false);
            clearRoleCache();
            break;
            
          case 'TOKEN_REFRESHED':
            if (newSession) {
              setSession(newSession);
              // 토큰 갱신 시에도 즉시 정보 추출
              const role = newSession.user.user_metadata?.role || 'customer';
              const nickname = newSession.user.user_metadata?.name || newSession.user.user_metadata?.nickname;

              const authUserData: AuthUser = {
                id: newSession.user.id,
                email: newSession.user.email || '',
                role: role as UserRole,
                nickname: nickname,
              };

              setUser(newSession.user);
              setAuthUser(authUserData);
              setLoading(false);
            }
            break;
            
          case 'INITIAL_SESSION':
            setSession(newSession);
            if (newSession?.user) {
              // 초기 세션에서도 즉시 정보 추출
              const role = newSession.user.user_metadata?.role || 'customer';
              const nickname = newSession.user.user_metadata?.name || newSession.user.user_metadata?.nickname;

              const authUserData: AuthUser = {
                id: newSession.user.id,
                email: newSession.user.email || '',
                role: role as UserRole,
                nickname: nickname,
              };

              setUser(newSession.user);
              setAuthUser(authUserData);
              setLoading(false);
            } else {
              setLoading(false);
            }
            break;
            
          case 'PASSWORD_RECOVERY':
            setLoading(false);
            break;
            
          default:
            debugLog('알 수 없는 인증 이벤트', { event });
            setLoading(false);
        }
      }
    );

    // 컴포넌트 언마운트 시 정리
    return () => {
      debugLog('AuthProvider 언마운트');
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, debugLog, getSession]);

  // ✅ 로딩 타임아웃 (최대 3초 후 강제 해제)
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        if (mountedRef.current && loading) {
          debugLog('로딩 타임아웃 - 강제 해제');
          setLoading(false);
        }
      }, 3000); // 3초 타임아웃으로 단축

      return () => clearTimeout(timeoutId);
    }
  }, [loading, debugLog]);

  const value: AuthContextType = {
    session,
    user,
    authUser,
    isAdmin,
    loading,
    error,
    signInWithKakao,
    signInWithNaver,
    signOut,
    refreshUser,
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