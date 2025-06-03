"use client";

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NAVIGATION_ROUTES } from '@/lib/constants/navigation';

interface UseAccountNavigationReturn {
  handleAccountClick: () => void;
  navigationTarget: string;
  isNavigating: boolean;
  canNavigate: boolean;
}

export function useAccountNavigation(): UseAccountNavigationReturn {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  // 네비게이션 타겟 결정
  const navigationTarget = useMemo(() => {
    if (!user) return NAVIGATION_ROUTES.LOGIN;
    return NAVIGATION_ROUTES.MY_PAGE;
  }, [user]);

  // 네비게이션 가능 여부
  const canNavigate = useMemo(() => {
    return !loading && !isNavigating;
  }, [loading, isNavigating]);

  // 에러 처리 함수
  const handleNetworkError = useCallback((error: unknown) => {
    console.error('[AccountNavigation] 네비게이션 오류:', error);
    
    // 오프라인 상태 체크
    if (typeof window !== 'undefined' && !navigator.onLine) {
      alert('네트워크 연결을 확인해주세요.');
      return;
    }
    
    // 기타 에러에 대한 사용자 알림
    const shouldRetry = confirm('페이지 이동에 실패했습니다. 다시 시도하시겠습니까?');
    if (shouldRetry) {
      // 재시도는 사용자가 버튼을 다시 클릭하도록 유도
      setIsNavigating(false);
    }
  }, []);

  // 계정 아이콘 클릭 핸들러
  const handleAccountClick = useCallback(async () => {
    if (!canNavigate) {
      console.log('[AccountNavigation] 네비게이션 불가 상태:', { loading, isNavigating });
      return;
    }

    try {
      setIsNavigating(true);
      
      // 네비게이션 전 상태 저장 (페이지 전환 시 깨지지 않도록 보장)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('pronto_navigation_state', JSON.stringify({
            from: window.location.pathname,
            to: navigationTarget,
            timestamp: Date.now(),
            userAgent: navigator.userAgent.substring(0, 100) // 디버깅용
          }));
        } catch (storageError) {
          // sessionStorage 실패 시에도 계속 진행
          console.warn('[AccountNavigation] sessionStorage 저장 실패:', storageError);
        }
      }

      // Google Analytics 등 분석 도구 연동 (에러 방지)
      if (typeof window !== 'undefined') {
        try {
          if ((window as any).gtag) {
            (window as any).gtag('event', 'account_icon_click', {
              user_status: user ? 'logged_in' : 'logged_out',
              target_page: navigationTarget,
              timestamp: Date.now()
            });
          }
        } catch (analyticsError) {
          // 분석 도구 에러는 무시하고 계속 진행
          console.warn('[AccountNavigation] Analytics 전송 실패:', analyticsError);
        }
      }

      // 라우터 푸시 (타임아웃 추가)
      const navigationPromise = router.push(navigationTarget);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Navigation timeout')), 10000); // 10초 타임아웃
      });

      await Promise.race([navigationPromise, timeoutPromise]);
      
    } catch (error) {
      handleNetworkError(error);
    } finally {
      // 성공/실패와 상관없이 로딩 상태 해제
      // 단, 네트워크 에러가 아닌 경우에만 (재시도 가능하도록)
      if (typeof window !== 'undefined' && navigator.onLine) {
        // 약간의 지연을 두어 깜빡임 방지
        setTimeout(() => {
          setIsNavigating(false);
        }, 100);
      }
    }
  }, [canNavigate, loading, isNavigating, navigationTarget, router, user, handleNetworkError]);

  return {
    handleAccountClick,
    navigationTarget,
    isNavigating,
    canNavigate
  };
} 