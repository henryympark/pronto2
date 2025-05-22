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
  
  // 상태 변경 추적 방지 플래그
  const authActionInProgressRef = useRef(false);
  
  // useSupabase 훅을 사용하여 단일 Supabase 인스턴스 사용
  const supabase = useSupabase();
  
  // 로딩 상태 변경 함수 - 로깅 추가
  const updateLoading = useCallback((value: boolean, source: string) => {
    console.log(`[AuthContext] 로딩 상태 변경: ${value ? 'true' : 'false'}, 출처: ${source}`);
    setLoading(value);
  }, []);
  
  // 관리자 상태 확인 함수
  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] 어드민 상태 확인 시작:', userId);
      
      const { data, error } = await supabase.rpc('check_admin_access');
      
      if (error) {
        console.error('[AuthContext] 어드민 체크 오류:', error);
        return false;
      }
      
      const newAdminState = !!data;
      console.log('[AuthContext] 어드민 체크 결과:', newAdminState);
      
      // 함수에서는 상태를 변경하지 않고 결과만 반환
      return newAdminState;
    } catch (error) {
      console.error('[AuthContext] 어드민 상태 확인 오류:', error);
      return false;
    }
  }, [supabase]);
  
  // 현재 세션 가져오기 함수
  const getSession = useCallback(async () => {
    try {
      // 이미 다른 인증 작업이 진행 중이면 중복 실행 방지
      if (authActionInProgressRef.current) {
        console.log('[AuthContext] 다른 인증 작업이 진행 중, getSession 호출 무시');
        return;
      }
      
      authActionInProgressRef.current = true;
      console.log('[AuthContext] 세션 가져오기 시작');
      // 이미 user 정보가 있는 상태에서 getSession이 다시 호출될 경우, UI 로딩을 최소화
      if (!user) {
        updateLoading(true, 'getSession 시작 (user 없음)');
      } else {
        console.log('[AuthContext] getSession 시작 (user 이미 존재, UI 로딩 최소화)');
      }
      
      // 세션 가져오기
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      const currentSession = data.session;
      console.log('[AuthContext] 세션 확인 결과:', currentSession ? '세션 있음' : '세션 없음');
      
      // 세션 정보 업데이트
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      // 세션이 있으면 어드민 상태 확인
      if (currentSession?.user) {
        const isUserAdmin = await checkAdminStatus(currentSession.user.id);
        setIsAdmin(isUserAdmin);
        console.log('[AuthContext] 어드민 상태 설정 완료:', isUserAdmin);
      } else {
        setIsAdmin(false);
      }
      
      // 모든 작업 완료 후 로딩 상태 false로 변경
      updateLoading(false, 'getSession 완료');
      authActionInProgressRef.current = false;
    } catch (err) {
      console.error("[AuthContext] 세션 가져오기 오류:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      updateLoading(false, 'getSession 오류');
      authActionInProgressRef.current = false;
    }
  }, [supabase.auth, checkAdminStatus, updateLoading, user]);

  // 로그아웃 함수
  const signOut = useCallback(async () => {
    try {
      // 이미 다른 인증 작업이 진행 중이면 중복 실행 방지
      if (authActionInProgressRef.current) {
        console.log('[AuthContext] 다른 인증 작업이 진행 중, signOut 호출 무시');
        return;
      }
      
      authActionInProgressRef.current = true;
      console.log('[AuthContext] 로그아웃 시작');
      updateLoading(true, 'signOut 시작');
      
      // 로그아웃 전에 사용자 상태 초기화
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      
      // Supabase 로그아웃 요청 - global 스코프로 모든 디바이스에서 로그아웃
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        throw error;
      }
      
      // 로딩 상태를 즉시 false로 변경
      console.log('[AuthContext] 로그아웃 완료');
      updateLoading(false, 'signOut 완료');
      
      // 브라우저 로컬 스토리지와 세션 스토리지 정리
      if (typeof window !== 'undefined') {
        // 세션 스토리지 정리
        sessionStorage.clear();
        
        // 무한루프 방지를 위한 리디렉션 타이머 초기화
        sessionStorage.removeItem('last_login_redirect_time');
        sessionStorage.removeItem('login_redirect_attempted');
        
        // 타임스탬프 추가하여 캐시 무효화
        const timestamp = Date.now();
        window.location.href = `/auth/login?t=${timestamp}`;
      }
      
      authActionInProgressRef.current = false;
    } catch (error) {
      console.error("[AuthContext] 로그아웃 오류:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
      updateLoading(false, 'signOut 오류');
      authActionInProgressRef.current = false;
      throw error;
    }
  }, [supabase.auth, updateLoading]);

  // 카카오 로그인 함수
  const signInWithKakao = useCallback(async () => {
    try {
      // 이미 다른 인증 작업이 진행 중이면 중복 실행 방지
      if (authActionInProgressRef.current) {
        console.log('[AuthContext] 다른 인증 작업이 진행 중, signInWithKakao 호출 무시');
        return;
      }
      
      authActionInProgressRef.current = true;
      console.log('[AuthContext] 카카오 로그인 시작');
      updateLoading(true, 'signInWithKakao 시작');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao' as Provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      // 성공 시 상태는 onAuthStateChange에서 처리됨
      return data;
    } catch (error) {
      console.error("[AuthContext] 카카오 로그인 오류:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
      updateLoading(false, 'signInWithKakao 오류');
      authActionInProgressRef.current = false;
      throw error;
    }
  }, [supabase.auth, updateLoading]);

  // 네이버 로그인 함수
  const signInWithNaver = useCallback(async () => {
    try {
      // 이미 다른 인증 작업이 진행 중이면 중복 실행 방지
      if (authActionInProgressRef.current) {
        console.log('[AuthContext] 다른 인증 작업이 진행 중, signInWithNaver 호출 무시');
        return;
      }
      
      authActionInProgressRef.current = true;
      console.log('[AuthContext] 네이버 로그인 시작');
      updateLoading(true, 'signInWithNaver 시작');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'naver' as Provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      // 성공 시 상태는 onAuthStateChange에서 처리됨
      return data;
    } catch (error) {
      console.error("[AuthContext] 네이버 로그인 오류:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
      updateLoading(false, 'signInWithNaver 오류');
      authActionInProgressRef.current = false;
      throw error;
    }
  }, [supabase.auth, updateLoading]);

  // 초기화 및 인증 상태 변경 감지 (최초 1회만 실행)
  useEffect(() => {
    console.log('[AuthContext] 컴포넌트 최초 마운트: 초기 세션 로드 시작');
    
    // 컴포넌트 마운트 상태 추적
    let isMounted = true;
    
    // 초기 세션 로드 함수
    const loadInitialSession = async () => {
      try {
        await getSession();
      } catch (error) {
        console.error('[AuthContext] 초기 세션 로드 오류:', error);
        if (isMounted) {
          updateLoading(false, 'initialLoad 오류');
        }
      }
    };
    
    // 초기 세션 로드 실행
    loadInitialSession();
    
    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthContext] 인증 상태 변경:', event, newSession ? '세션 있음' : '세션 없음');
        
        if (!isMounted) return;
        
        // 이미 다른 인증 작업이 진행 중이면 상태 업데이트 건너뛰기
        if (authActionInProgressRef.current && event !== 'INITIAL_SESSION') {
          console.log(`[AuthContext] 다른 인증 작업이 진행 중, ${event} 이벤트 처리 생략`);
          return;
        }
        
        if (event === 'SIGNED_IN') {
          authActionInProgressRef.current = true;
          updateLoading(true, 'SIGNED_IN 이벤트 시작');
          
          try {
            if (newSession?.user) {
              console.log('[AuthContext] 로그인 성공 - 세션 및 사용자 정보 업데이트');
              
              // 세션 및 사용자 정보 업데이트
              setSession(newSession);
              setUser(newSession.user);
              
              // 어드민 상태 확인 및 설정 - 순차적으로 진행
              const isUserAdmin = await checkAdminStatus(newSession.user.id);
              setIsAdmin(isUserAdmin);
              console.log('[AuthContext] 어드민 상태 설정 완료:', isUserAdmin);
            } else {
              console.log('[AuthContext] 로그인 이벤트이나 세션 없음 - 상태 초기화');
              setSession(null);
              setUser(null);
              setIsAdmin(false);
            }
          } catch (error) {
            console.error('[AuthContext] SIGNED_IN 이벤트 처리 오류:', error);
            // 오류 시 상태를 명확하게 초기화
            setIsAdmin(false);
          } finally {
            // 모든 상태 업데이트가 완료된 후에 loading 상태 변경
            console.log('[AuthContext] SIGNED_IN 이벤트 처리 완료: loading=false로 설정');
            updateLoading(false, 'SIGNED_IN 이벤트 완료');
            authActionInProgressRef.current = false;
          }
        } else if (event === 'SIGNED_OUT') {
          authActionInProgressRef.current = true;
          updateLoading(true, 'SIGNED_OUT 이벤트 시작');
          
          try {
            console.log('[AuthContext] 로그아웃 - 상태 초기화');
            setSession(null);
            setUser(null);
            setIsAdmin(false);
          } finally {
            updateLoading(false, 'SIGNED_OUT 이벤트 완료');
            authActionInProgressRef.current = false;
          }
        } else if (event === 'USER_UPDATED' && newSession) {
          authActionInProgressRef.current = true;
          updateLoading(true, 'USER_UPDATED 이벤트 시작');
          
          try {
            console.log('[AuthContext] 사용자 정보 업데이트');
            setSession(newSession);
            setUser(newSession.user);
            
            if (newSession.user) {
              const isUserAdmin = await checkAdminStatus(newSession.user.id);
              setIsAdmin(isUserAdmin);
              console.log('[AuthContext] 어드민 상태 설정 완료:', isUserAdmin);
            } else {
              setIsAdmin(false);
            }
          } catch (error) {
            console.error('[AuthContext] USER_UPDATED 이벤트 처리 오류:', error);
            setIsAdmin(false);
          } finally {
            updateLoading(false, 'USER_UPDATED 이벤트 완료');
            authActionInProgressRef.current = false;
          }
        } else if (event === 'INITIAL_SESSION') {
          // 초기 세션 이벤트는 getSession에서 이미 처리했을 가능성이 높으므로
          // 세션이 있지만 getSession이 아직 완료되지 않은 경우에만 처리
          if (newSession && (!session || loading)) {
            console.log('[AuthContext] 초기 세션 감지 - 세션 정보 동기화');
            
            // getSession이 실행 중이 아닌 경우에만 상태 업데이트 수행
            if (!authActionInProgressRef.current) {
              authActionInProgressRef.current = true;
              updateLoading(true, 'INITIAL_SESSION 처리 시작');
              
              try {
                setSession(newSession);
                setUser(newSession.user);
                
                // 어드민 상태 확인 및 설정
                if (newSession.user) {
                  const isUserAdmin = await checkAdminStatus(newSession.user.id);
                  setIsAdmin(isUserAdmin);
                  console.log('[AuthContext] 어드민 상태 설정 완료:', isUserAdmin);
                }
              } catch (error) {
                console.error('[AuthContext] INITIAL_SESSION 처리 오류:', error);
                setIsAdmin(false);
              } finally {
                updateLoading(false, 'INITIAL_SESSION 처리 완료');
                authActionInProgressRef.current = false;
              }
            }
          } else if (!newSession && loading) {
            // 초기 세션이 없고 아직 로딩 상태인 경우 로딩 완료 처리
            console.log('[AuthContext] 초기 세션 없음 - 로딩 완료 처리');
            updateLoading(false, 'INITIAL_SESSION (세션 없음)');
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          // 토큰 갱신 시 세션 정보 업데이트
          console.log('[AuthContext] 토큰 갱신 - 세션 정보 업데이트');
          setSession(newSession);
          setUser(newSession.user);
        }
      }
    );

    // 세션 자동 새로고침 설정 (5분마다)
    const refreshInterval = setInterval(async () => {
      if (!isMounted || !session) return;
      
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('[AuthContext] 세션 자동 새로고침 실패:', error.message);
        } else if (data.session) {
          console.log('[AuthContext] 세션 자동 새로고침 성공');
          setSession(data.session);
          setUser(data.session.user);
        }
      } catch (error) {
        console.error('[AuthContext] 세션 자동 새로고침 오류:', error);
      }
    }, 300000); // 5분마다

    // 클린업 함수
    return () => {
      console.log('[AuthContext] 컴포넌트 언마운트');
      isMounted = false;
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  }, []); // 의존성 배열 비움 - 최초 마운트 시 한 번만 실행

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