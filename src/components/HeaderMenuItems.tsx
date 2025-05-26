"use client";

import Link from "next/link";
import { Settings, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { menuItemStyles } from "@/components/styles";

interface HeaderMenuItemsProps {
  shouldRenderUserButtons: boolean;
  shouldRenderLoginButton: boolean;
  isAdmin: boolean;
  isServicePath: boolean;
  specialPathClasses: string;
  handleSignOut: () => Promise<void>;
  closeMenu?: () => void;
  isMobile?: boolean;
  isLoading: boolean;
  isMounted: boolean;
}

export function HeaderMenuItems({
  shouldRenderUserButtons,
  shouldRenderLoginButton,
  isAdmin,
  isServicePath,
  specialPathClasses,
  handleSignOut,
  closeMenu = () => {},
  isMobile = false,
  isLoading,
  isMounted
}: HeaderMenuItemsProps) {
  const servicePathClass = isServicePath ? menuItemStyles.servicePath : "";
  
  // 로딩 메시지 표시 조건 - 초기 마운트 시에만
  const showLoadingMessage = !isMounted;
  
  // sessionStorage 백업 체크 (클라이언트에서만)
  const getStoredAuthState = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('pronto_auth_state');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const storedAuth = getStoredAuthState();
  const hasUserFromStorage = storedAuth?.hasUser === true;
  const isAdminFromStorage = storedAuth?.isAdmin === true;

  // 백업 렌더링 조건 (sessionStorage 기반)
  const shouldShowUserButtonsBackup = shouldRenderUserButtons || (isMounted && hasUserFromStorage && isLoading);
  const shouldShowLoginButtonBackup = shouldRenderLoginButton || (isMounted && !hasUserFromStorage && isLoading);
  const shouldShowAdminButton = shouldShowUserButtonsBackup && (isAdmin || isAdminFromStorage);

  // 서비스 페이지에서만 디버깅 로그
  if (isServicePath && process.env.NODE_ENV === 'development') {
    console.log('[HeaderMenuItems] 🔍 서비스 페이지:', { 
      shouldShowUserButtonsBackup,
      shouldShowLoginButtonBackup,
      shouldShowAdminButton,
      hasUserFromStorage,
      isAdmin,
      isMounted,
      isLoading
    });
  }

  return (
    <>
      {/* 관리자 페이지로 이동 버튼 (관리자만 표시) - 🔧 수정: /admin/reservations로 변경 */}
      {shouldShowAdminButton && (
        <Link href="/admin/reservations" onClick={isMobile ? closeMenu : undefined}>
          <Button 
            variant="outline" 
            className={cn(
              menuItemStyles.baseButton, 
              isMobile && menuItemStyles.mobileButton
            )}
          >
            <Settings className={menuItemStyles.icon} />
            관리자
          </Button>
        </Link>
      )}
      
      {/* 마이페이지 버튼 (로그인 시 표시) */}
      {shouldShowUserButtonsBackup && (
        <Link href="/my" onClick={isMobile ? closeMenu : undefined}>
          <Button 
            variant="outline" 
            className={cn(
              menuItemStyles.baseButton, 
              isMobile && menuItemStyles.mobileButton,
              servicePathClass,
              specialPathClasses
            )}
          >
            <User className={menuItemStyles.icon} />
            마이페이지
          </Button>
        </Link>
      )}
      
      {/* 로그아웃 버튼 (로그인 시 표시) */}
      {shouldShowUserButtonsBackup && (
        <Button 
          variant="ghost" 
          onClick={handleSignOut} 
          className={cn(
            menuItemStyles.baseButton, 
            isMobile && menuItemStyles.mobileButton,
            servicePathClass,
            specialPathClasses
          )}
        >
          <LogIn className={menuItemStyles.icon} />
          로그아웃
        </Button>
      )}
      
      {/* 로그인 버튼 (미로그인 시 표시) */}
      {shouldShowLoginButtonBackup && (
        <Link href="/auth/login" onClick={isMobile ? closeMenu : undefined}>
          <Button 
            variant="outline" 
            className={cn(
              menuItemStyles.baseButton, 
              isMobile && menuItemStyles.mobileButton
            )}
          >
            <LogIn className={menuItemStyles.icon} />
            로그인
          </Button>
        </Link>
      )}
      
      {/* 로딩 중일 때 표시 */}
      {showLoadingMessage && (
        <span className={menuItemStyles.loadingText}>로딩 중...</span>
      )}
    </>
  );
}