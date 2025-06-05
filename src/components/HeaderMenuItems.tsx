"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountIcon } from "@/components/account";
import { cn } from "@/lib/utils";
import { menuItemStyles } from "@/components/styles";

interface HeaderMenuItemsProps {
  shouldRenderUserButtons: boolean;
  shouldRenderLoginButton: boolean;
  isAdmin: boolean;
  isServicePath: boolean;
  specialPathClasses: string;
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
  closeMenu = () => {},
  isMobile = false,
  isLoading,
  isMounted
}: HeaderMenuItemsProps) {
  const servicePathClass = isServicePath && shouldRenderUserButtons ? menuItemStyles.servicePath : "";
  
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
  const shouldShowAdminButton = shouldShowUserButtonsBackup && (isAdmin || isAdminFromStorage);

  // 서비스 페이지에서만 디버깅 로그
  if (isServicePath && process.env.NODE_ENV === 'development') {
    console.log('[HeaderMenuItems] 🔍 서비스 페이지:', { 
      shouldShowUserButtonsBackup,
      shouldShowAdminButton,
      hasUserFromStorage,
      isAdmin,
      isMounted,
      isLoading
    });
  }

  return (
    <>
      {/* 관리자 페이지로 이동 버튼 (관리자만 표시) */}
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
      
      {/* 계정 아이콘 - 로그인/마이페이지 통합 버튼 */}
      <div 
        className={cn(
          "flex items-center",
          isMobile && "justify-center"
        )}
      >
        <AccountIcon 
          size="sm"
          className={cn(
            servicePathClass,
            specialPathClasses
          )}
          showTooltip={!isMobile} // 모바일에서는 툴팁 숨김
          onAfterClick={isMobile ? closeMenu : undefined} // 모바일에서 네비게이션 후 메뉴 닫기
        />
      </div>
    </>
  );
}