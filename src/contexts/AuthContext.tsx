"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Session, User, Provider } from "@supabase/supabase-js";
import { useSupabase } from "./SupabaseContext";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const actionInProgressRef = useRef(false);
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
  
  // 관리자 상태 확인
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      debugLog('어드민 상태 확인', { userId });
      const { data, error } = await supabase.rpc('check_admin_access');
      
      if (error) {
        debugLog('어드민 체크 오류', { error: error.message });
        return false;
      }
      
      const isUserAdmin = !!data;
      debugLog('어드민 체크 완료', { isAdmin: isUserAdmin });
      return isUserAdmin;
    } catch (error) {
      debugLog('어드민 상태 확인 예외', { error });
      return false;
    }
  }, [supabase, debugLog]);
  
  // 상태 업데이트 헬퍼
  const updateAuthState = useCallback((updates: {
    session?: Session | null;
    user?: User | null;
    isAdmin?: boolean;
    loading?: boolean;
    isInitialized?: boolean;
  }) => {
    if (!mountedRef.current) return;
    
    debugLog('상태 업데이트', updates);
    
    if (updates.session !== undefined) setSession(updates.session);
    if (updates.user !== undefined) setUser(updates.user);
    if (updates.isAdmin !== undefined) setIsAdmin(updates.isAdmin);
    if (updates.loading !== undefined) setLoading(updates.loading);
    if (updates.isInitialized !== undefined) setIsInitialized(updates.isInitialized);
  }, [debugLog]);
  
  // 세션 가져오기
  const getSession = useCallback(async () => {
    if (actionInProgressRef.current || !mountedRef.current) {
      debugLog('getSession 스킵', { 
        actionInProgress: actionInProgressRef.current, 
        mounted: mountedRef.current 
      });
      return;
    }
    
    actionInProgressRef.current = true;
    debugLog('세션 가져오기 시작');
    
    try {
      if (!isInitialized) {
        updateAuthState({ loading: true });
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      const currentSession = data.session;
      debugLog('세션 확인 완료', { hasSession: !!currentSession });
      
      updateAuthState({
        session: currentSession,
        user: currentSession?.user || null
      });
      
      // 관리자 상태 확인
      let adminStatus = false;
      if (currentSession?.user) {
        adminStatus = await checkAdminStatus(currentSession.user.id);
      }
      
      // 최종 상태 업데이트
      updateAuthState({
        isAdmin: adminStatus,
        loading: false,
        isInitialized: true
      });
      
      // sessionStorage 동기화
      if (typeof window !== 'undefined') {
        const authState = {
          hasUser: !!currentSession?.user,
          isAdmin: adminStatus,
          timestamp: Date.now()
        };
        sessionStorage.setItem('pronto_auth_state', JSON.stringify(authState));
      }
      
    } catch (err) {
      debugLog('세션 가져오기 오류', { error: err });
      setError(err instanceof Error ? err : new Error(String(err)));
      
      updateAuthState({
        session: null,
        user: null,
        isAdmin: false,
        loading: false,
        isInitialized: true
      });
      
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pronto_auth_state');
      }
    } finally {
      actionInProgressRef.current = false;
    }
  }, [supabase.auth, checkAdminStatus, updateAuthState, isInitialized, debugLog]);

  // 로그아웃
  const signOut = useCallback(async () => {
    if (actionInProgressRef.current) {
      debugLog('signOut 스킵 - 액션 진행 중');
      return;
    }
    
    actionInProgressRef.current = true;
    debugLog('로그아웃 시작');
    
    try {
      updateAuthState({
        session: null,
        user: null,
        isAdmin: false,
        loading: false
      });
      
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        debugLog('로그아웃 오류', { error: error.message });
      }
      
      debugLog('로그아웃 완료');
      
      if (typeof window !== 'undefined') {
        window.location.href = `/auth/login?t=${Date.now()}`;
      }
      
    } catch (error) {
      debugLog('로그아웃 예외', { error });
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      actionInProgressRef.current = false;
    }
  }, [supabase.auth, updateAuthState, debugLog]);

  // OAuth 로그인들
  const signInWithKakao = useCallback(async () => {
    if (actionInProgressRef.current) return;
    
    actionInProgressRef.current = true;
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
    } finally {
      actionInProgressRef.current = false;
    }
  }, [supabase.auth, debugLog]);

  const signInWithNaver = useCallback(async () => {
    if (actionInProgressRef.current) return;
    
    actionInProgressRef.current = true;
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
    } finally {
      actionInProgressRef.current = false;
    }
  }, [supabase.auth, debugLog]);

  // 초기화 및 인증 상태 변경 감지
  useEffect(() => {
    debugLog('AuthProvider 마운트');
    mountedRef.current = true;
    
    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        debugLog('인증 상태 변경', { event, hasSession: !!newSession });
        
        if (!mountedRef.current) return;
        
        if (actionInProgressRef.current && event !== 'INITIAL_SESSION') {
          debugLog('액션 진행 중 - 이벤트 처리 스킵', { event });
          return;
        }
        
        switch (event) {
          case 'SIGNED_IN':
            if (newSession?.user) {
              actionInProgressRef.current = true;
              try {
                updateAuthState({
                  session: newSession,
                  user: newSession.user
                });
                
                const adminStatus = await checkAdminStatus(newSession.user.id);
                updateAuthState({
                  isAdmin: adminStatus,
                  loading: false,
                  isInitialized: true
                });
                
                if (typeof window !== 'undefined') {
                  const authState = {
                    hasUser: true,
                    isAdmin: adminStatus,
                    timestamp: Date.now()
                  };
                  sessionStorage.setItem('pronto_auth_state', JSON.stringify(authState));
                }
              } finally {
                actionInProgressRef.current = false;
              }
            }
            break;
            
          case 'SIGNED_OUT':
            updateAuthState({
              session: null,
              user: null,
              isAdmin: false,
              loading: false
            });
            
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pronto_auth_state');
            }
            break;
            
          case 'TOKEN_REFRESHED':
            if (newSession) {
              updateAuthState({
                session: newSession,
                user: newSession.user
              });
            }
            break;
        }
      }
    );

    // ✅ Visibility API 간섭 방지
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debugLog('페이지가 다시 보여짐 - 상태 안정화 대기');
        // 페이지가 다시 보여질 때 잠시 대기 후 상태 확인
        setTimeout(() => {
          if (!mountedRef.current || actionInProgressRef.current) return;
          
          // 현재 상태가 불안정한 경우에만 세션 재확인
          if (loading && session) {
            debugLog('Visibility 복구 후 상태 동기화');
            updateAuthState({ loading: false });
          }
        }, 500);
      }
    };

    // Visibility change 이벤트 리스너 추가
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      debugLog('AuthProvider 언마운트');
      mountedRef.current = false;
      subscription.unsubscribe();
      
      // 이벤트 리스너 정리
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [getSession, supabase.auth, checkAdminStatus, updateAuthState, debugLog, loading, session]);

  const value: AuthContextType = {
    session,
    user,
    loading,
    error,
    isAdmin,
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