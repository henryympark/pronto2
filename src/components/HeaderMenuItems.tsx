"use client";

import { useEffect } from "react";
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
  closeMenu?: () => void; // 모바일 메뉴에서만 사용됨
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
  // 서비스 페이지 스타일 적용 여부
  const servicePathClass = isServicePath ? menuItemStyles.servicePath : "";
  
  // 로딩 메시지 표시 여부 - 초기 마운트 시에만 로딩 메시지 표시, 그 이후 데이터 갱신 시에는 이전 상태 유지
  const showLoadingMessage = !isMounted || (isLoading && !shouldRenderUserButtons && !shouldRenderLoginButton);
  
  // 서비스 페이지에서의 버튼 표시 여부 디버깅
  useEffect(() => {
    if (isServicePath && process.env.NODE_ENV === 'development') {
      console.log('[HeaderMenuItems] 서비스 페이지 렌더링 상태:', { 
        shouldRenderUserButtons,
        shouldRenderLoginButton,
        isAdmin,
        isMounted,
        isLoading,
        servicePathClass,
        specialPathClasses,
        showLoadingMessage,
        // 버튼 가시성 디버깅
        visibilityCheck: {
          adminButtonVisible: shouldRenderUserButtons && isAdmin,
          myPageButtonVisible: shouldRenderUserButtons,
          logoutButtonVisible: shouldRenderUserButtons,
          loginButtonVisible: shouldRenderLoginButton,
          loadingMessageVisible: showLoadingMessage
        }
      });
    }
  }, [isServicePath, shouldRenderUserButtons, shouldRenderLoginButton, isAdmin, isMounted, isLoading, servicePathClass, specialPathClasses, showLoadingMessage]);

  // 특별히 서비스 페이지에서 버튼 가시성을 강제하는 클래스를 생성
  const forceVisibilityClasses = isServicePath ? "!block !visible opacity-100" : "";

  return (
    <>
      {/* 관리자 페이지로 이동 버튼 (관리자만 표시) */}
      {shouldRenderUserButtons && isAdmin && (
        <Link href="/admin" onClick={isMobile ? closeMenu : undefined}>
          <Button 
            variant="outline" 
            className={cn(
              menuItemStyles.baseButton, 
              isMobile && menuItemStyles.mobileButton,
              forceVisibilityClasses
            )}
          >
            <Settings className={menuItemStyles.icon} />
            관리자
          </Button>
        </Link>
      )}
      
      {/* 마이페이지 버튼 (로그인 시 표시) */}
      {shouldRenderUserButtons && (
        <Link href="/my" onClick={isMobile ? closeMenu : undefined}>
          <Button 
            variant="outline" 
            className={cn(
              menuItemStyles.baseButton, 
              isMobile && menuItemStyles.mobileButton,
              servicePathClass,
              specialPathClasses,
              forceVisibilityClasses
            )}
          >
            <User className={menuItemStyles.icon} />
            마이페이지
          </Button>
        </Link>
      )}
      
      {/* 로그아웃 버튼 (로그인 시 표시) */}
      {shouldRenderUserButtons && (
        <Button 
          variant="ghost" 
          onClick={handleSignOut} 
          className={cn(
            menuItemStyles.baseButton, 
            isMobile && menuItemStyles.mobileButton,
            servicePathClass,
            specialPathClasses,
            forceVisibilityClasses
          )}
        >
          <LogIn className={menuItemStyles.icon} />
          로그아웃
        </Button>
      )}
      
      {/* 로그인 버튼 (미로그인 시 표시) */}
      {shouldRenderLoginButton && (
        <Link href="/auth/login" onClick={isMobile ? closeMenu : undefined}>
          <Button 
            variant="outline" 
            className={cn(
              menuItemStyles.baseButton, 
              isMobile && menuItemStyles.mobileButton,
              forceVisibilityClasses
            )}
          >
            <LogIn className={menuItemStyles.icon} />
            로그인
          </Button>
        </Link>
      )}
      
      {/* 로딩 중일 때 표시 - 초기 마운트 시에만 */}
      {showLoadingMessage && (
        <span className={cn(menuItemStyles.loadingText, forceVisibilityClasses)}>로딩 중...</span>
      )}
      
      {/* 서비스 페이지에서 디버그 정보 표시 */}
      {isServicePath && process.env.NODE_ENV === 'development' && (
        <div className="hidden">
          {/* 디버그 정보는 브라우저 검사도구에서 확인 가능 */}
          <pre id="header-debug-info">
            {JSON.stringify({
              shouldRenderUserButtons,
              shouldRenderLoginButton,
              isAdmin,
              isLoading
            }, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
} 