"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useIsMounted } from "./useIsMounted";

interface HeaderNavigationReturn {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  isServicePath: boolean;
  specialPathClasses: string;
}

/**
 * 헤더 내비게이션 관련 상태와 기능을 관리하는 커스텀 훅
 */
export function useHeaderNavigation(): HeaderNavigationReturn {
  const pathname = usePathname();
  const isMounted = useIsMounted();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 서비스 경로인지 확인 - 더 확실한 체크 로직 추가
  const isServicePath = useMemo(() => {
    if (!pathname) return false;
    
    // 더 엄격한 체크 - 정확히 /service/ 경로를 포함한 경우만
    const pathIncludesService = pathname.includes('/service/');
    
    // 디버깅을 위한 로그
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useHeaderNavigation] 서비스 경로 체크: ${pathname}, 결과: ${pathIncludesService}`);
    }
    
    return pathIncludesService;
  }, [pathname]);
  
  // ✅ 특별한 경로에 대한 스타일 클래스 - 문제 클래스 제거
  const specialPathClasses = useMemo(() => {
    if (isServicePath) {
      // !block 제거 - 이것이 flex 레이아웃을 방해했음
      return ""; // 또는 필요한 다른 클래스만 사용
    }
    return "";
  }, [isServicePath]);
  
  // 경로 변경 감지 디버그 로깅
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useHeaderNavigation] 경로 변경 감지:', {
        pathname,
        isServicePath,
        isMounted,
        specialPathClasses: specialPathClasses || '(빈 문자열)'
      });
    }
  }, [pathname, isServicePath, isMounted, specialPathClasses]);
  
  // 메뉴 토글 함수
  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };
  
  // 메뉴 닫기 함수
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  return {
    isMenuOpen,
    toggleMenu,
    closeMenu,
    isServicePath,
    specialPathClasses
  };
}