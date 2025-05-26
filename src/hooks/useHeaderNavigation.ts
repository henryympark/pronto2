import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * useHeaderNavigation hook
 * 헤더에서 사용할 네비게이션 관련 함수들을 제공
 */

export interface UseHeaderNavigationReturn {
  navigateToHome: () => void;
  navigateToProfile: () => void;
  navigateToReservations: () => void;
  navigateToAdmin: () => void;
  navigateToLogin: () => void;
  navigateToSignup: () => void;
  goBack: () => void;
}

export const useHeaderNavigation = (): UseHeaderNavigationReturn => {
  const router = useRouter();

  const navigateToHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const navigateToProfile = useCallback(() => {
    router.push('/my');
  }, [router]);

  const navigateToReservations = useCallback(() => {
    router.push('/my/reservations');
  }, [router]);

  const navigateToAdmin = useCallback(() => {
    router.push('/admin');
  }, [router]);

  const navigateToLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  const navigateToSignup = useCallback(() => {
    router.push('/signup');
  }, [router]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    navigateToHome,
    navigateToProfile,
    navigateToReservations,
    navigateToAdmin,
    navigateToLogin,
    navigateToSignup,
    goBack
  };
};

export default useHeaderNavigation;
