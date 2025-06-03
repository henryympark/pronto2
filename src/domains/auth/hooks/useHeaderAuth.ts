"use client";

import { useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMounted } from "@/shared/hooks";
import { usePathname } from "next/navigation";

interface HeaderAuthReturn {
  user: any;
  loading: boolean;
  isAdmin: boolean;
  shouldRenderUserButtons: boolean;
  shouldRenderLoginButton: boolean;
}

export function useHeaderAuth(): HeaderAuthReturn {
  const { user, authUser, isAdmin, loading } = useAuth();
  const isMounted = useIsMounted();
  const pathname = usePathname();
  
  const isServicePage = useMemo(() => {
    return pathname?.includes('/service/') ?? false;
  }, [pathname]);
  
  // ✅ sessionStorage 기반 백업 체크가 포함된 버튼 렌더링 로직
  const shouldRenderUserButtons = useMemo(() => {
    // sessionStorage 기반 백업 체크
    let hasUserFromStorage = false;
    
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('pronto_auth_state');
        if (stored) {
          const parsed = JSON.parse(stored);
          hasUserFromStorage = parsed.hasUser === true;
        }
      } catch (e) {
        // 무시
      }
    }
    
    // 주 조건 또는 백업 조건 (JWT metadata 기반)
    const mainCondition = isMounted && !loading && !!authUser;
    const backupCondition = isMounted && hasUserFromStorage && loading;
    
    const result = mainCondition || backupCondition;
    
    if (isServicePage && process.env.NODE_ENV === 'development') {
      console.log('[HeaderAuth] 🔍 사용자 버튼 렌더링 조건:', {
        mainCondition,
        backupCondition,
        hasUserFromStorage,
        result,
        isMounted,
        loading,
        hasAuthUser: !!authUser,
        isAdmin,
        pathname
      });
    }
    
    return result;
  }, [isMounted, loading, authUser, isAdmin, isServicePage, pathname]);

  const shouldRenderLoginButton = useMemo(() => {
    // sessionStorage 기반 백업 체크
    let hasUserFromStorage = false;
    
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('pronto_auth_state');
        if (stored) {
          const parsed = JSON.parse(stored);
          hasUserFromStorage = parsed.hasUser === true;
        }
      } catch (e) {
        // 무시
      }
    }
    
    const mainCondition = isMounted && !loading && !authUser;
    const backupCondition = isMounted && !hasUserFromStorage && loading;
    
    const result = mainCondition || backupCondition;
    
    if (isServicePage && process.env.NODE_ENV === 'development') {
      console.log('[HeaderAuth] 🔍 로그인 버튼 렌더링 조건:', {
        mainCondition,
        backupCondition,
        hasUserFromStorage,
        result,
        isMounted,
        loading,
        hasAuthUser: !!authUser,
        pathname
      });
    }
    
    return result;
  }, [isMounted, loading, authUser, isServicePage, pathname]);
  
  // 전체 상태 디버깅 로그
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logData = {
        pathname,
        isServicePage,
        isMounted,
        loading,
        hasUser: !!user,
        hasAuthUser: !!authUser,
        userId: authUser?.id,
        userRole: authUser?.role,
        isAdmin,
        shouldRenderUserButtons,
        shouldRenderLoginButton,
        timestamp: new Date().toISOString()
      };
      
      if (isServicePage) {
        console.log('[HeaderAuth] 🔍 서비스 페이지 전체 상태:', logData);
        
        // 문제 상황 감지
        if (isMounted && !loading && !shouldRenderUserButtons && !shouldRenderLoginButton) {
          console.warn('[HeaderAuth] ⚠️ 모든 버튼이 숨겨져 있습니다!');
        }
      } else {
        console.log('[HeaderAuth] 일반 페이지 상태:', logData);
      }
    }
  }, [pathname, isServicePage, isMounted, loading, user, authUser, isAdmin, shouldRenderUserButtons, shouldRenderLoginButton]);
  
  return {
    user,
    loading,
    isAdmin,
    shouldRenderUserButtons,
    shouldRenderLoginButton,
  };
}