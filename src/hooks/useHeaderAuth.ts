"use client";

import { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMounted } from "./useIsMounted";
import { usePathname } from "next/navigation";

interface HeaderAuthReturn {
  user: any;
  loading: boolean;
  isAdmin: boolean;
  shouldRenderUserButtons: boolean;
  shouldRenderLoginButton: boolean;
  handleSignOut: () => Promise<void>;
}

/**
 * 헤더에서 사용자 인증 상태와 관련 기능을 관리하는 커스텀 훅
 */
export function useHeaderAuth(): HeaderAuthReturn {
  const { user, loading, signOut, isAdmin } = useAuth();
  const isMounted = useIsMounted();
  const pathname = usePathname(); // 현재 경로 정보 가져오기
  
  // 서비스 페이지 여부 체크
  const isServicePage = useMemo(() => {
    return pathname?.includes('/service/') ?? false;
  }, [pathname]);
  
  // 디버깅용 상태
  const [lastUserState, setLastUserState] = useState<{id: string | null, isAdmin: boolean | null}>({
    id: null,
    isAdmin: null
  });
  
  // 인증 정보가 변경될 때 마지막 유효한 값 저장
  useEffect(() => {
    if (user) {
      setLastUserState({
        id: user.id,
        isAdmin: isAdmin
      });
    }
  }, [user, isAdmin]);
  
  // 사용자 관련 버튼 렌더링을 위한 조건
  // 새로고침 시에도 버튼이 사라지지 않도록 수정
  const shouldRenderUserButtons = useMemo(() => {
    // 기본 렌더링 조건
    const shouldRender = isMounted && !loading && !!user;
    
    // 로딩 중이고 이전에 사용자 로그인 상태가 있었으면 버튼 유지
    if (isMounted && loading && lastUserState.id !== null) {
      return true;
    }
    
    return shouldRender;
  }, [isMounted, loading, user, lastUserState.id]);

  const shouldRenderLoginButton = useMemo(() => {
    // 기본 렌더링 조건
    const shouldRender = isMounted && !loading && !user;
    
    // 로딩 중이고 이전에 사용자가 없었다면 로그인 버튼 표시
    if (isMounted && loading && lastUserState.id === null) {
      return true;
    }
    
    return shouldRender;
  }, [isMounted, loading, user, lastUserState.id]);
  
  // 로그아웃 처리 함수
  const handleSignOut = async () => {
    try {
      console.log('[Header] 로그아웃 시작');
      await signOut();
      // 로그아웃 후 로그인 페이지로 이동 (타임스탬프 추가하여 캐시 방지)
      window.location.href = `/auth/login?t=${Date.now()}`;
    } catch (error) {
      console.error('[Header] 로그아웃 처리 중 오류:', error);
    }
  };
  
  // 서비스 페이지에서 특별한 디버그 로그 추가
  useEffect(() => {
    if (isServicePage && process.env.NODE_ENV === 'development') {
      console.log('[HeaderAuth] 서비스 페이지 상세 디버깅:', { 
        path: pathname,
        userId: user?.id,
        isLoadingContext: loading, 
        isUserAdmin: isAdmin,
        isMounted,
        shouldRenderUserButtons,
        shouldRenderLoginButton,
        lastUserState,
        userEmail: user?.email,
        userMetadata: user?.user_metadata,
        loadingSource: '서비스 페이지 특별 로깅'
      });
    }
  }, [isServicePage, pathname, user, loading, isAdmin, isMounted, shouldRenderUserButtons, shouldRenderLoginButton, lastUserState]);
  
  // 개발 모드에서 디버그 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('[HeaderAuth] 상태:', { 
      userId: user?.id,
      isLoadingContext: loading, 
      isUserAdmin: isAdmin,
      isMounted,
      shouldRenderUserButtons,
      shouldRenderLoginButton,
      lastUserState
    });
  }
  
  return {
    user,
    loading,
    isAdmin,
    shouldRenderUserButtons,
    shouldRenderLoginButton,
    handleSignOut
  };
} 