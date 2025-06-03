"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeaderNavigation } from "@/shared/hooks";
import { useHeaderAuth } from "@/domains/auth";
import { useIsMounted } from "@/shared/hooks";
import { HeaderMenuItems } from "@/components/HeaderMenuItems";
import { cn } from "@/lib/utils";
import { headerStyles } from "@/components/styles";
import { usePathname } from "next/navigation";

export function Header() {
  const isMounted = useIsMounted();
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  
  // 내비게이션 관련 상태 및 기능
  const { 
    isMenuOpen, 
    toggleMenu, 
    closeMenu,
    isServicePath,
    specialPathClasses
  } = useHeaderNavigation();
  
  // 인증 관련 상태 및 기능
  const {
    user,
    loading,
    isAdmin,
    shouldRenderUserButtons,
    shouldRenderLoginButton
  } = useHeaderAuth();
  
  // 디버깅 로그 (개발 모드에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[Header] 통합 상태:", { 
        isMenuOpen,
        isServicePath,
        specialPathClasses,
        shouldRenderUserButtons,
        shouldRenderLoginButton,
        user: user?.id,
        isAdmin,
        isMounted,
        loading
      });
    }
  }, [isMenuOpen, isServicePath, specialPathClasses, shouldRenderUserButtons, shouldRenderLoginButton, user, isAdmin, isMounted, loading]);

  // 서비스 페이지 관련 특별 처리 (디버깅용)
  useEffect(() => {
    if (isServicePath && process.env.NODE_ENV === 'development') {
      console.log('[Header] 서비스 페이지 렌더링 디버깅:', {
        isServicePath,
        specialPathClasses,
        shouldRenderUserButtons,
        shouldRenderLoginButton,
        userId: user?.id,
        userLoaded: !!user,
        authLoading: loading,
        isMounted
      });
    }
  }, [isServicePath, specialPathClasses, shouldRenderUserButtons, shouldRenderLoginButton, user, loading, isMounted]);

  return (
    <div className="sticky top-0 z-50 w-full">
      <header className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        isAdminPage ? "w-full" : "w-full max-w-[500px] mx-auto"
      )}>
        {/* 데스크탑 헤더 */}
        <div className="flex h-16 items-center px-4">
          {/* 로고 영역 */}
          <div className={headerStyles.logoContainer}>
            <Link href="/" className={headerStyles.logo}>
              <span className={headerStyles.logoText}>
                Pronto2
              </span>
            </Link>
          </div>

          {/* 모바일 메뉴 버튼 (작은 화면에서만 표시) */}
          <div className={headerStyles.mobileMenuButtonContainer}>
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* 데스크탑 네비게이션 (중간-큰 화면에서만 표시) */}
          <nav className={headerStyles.desktopNav}>
            {process.env.NODE_ENV === 'development' && (
              <div className="hidden">
                {/* 디버깅 정보 - 브라우저에서 검사할 수 있음 */}
                <pre>
                  {JSON.stringify({
                    isServicePath,
                    shouldRenderUserButtons, 
                    userLoaded: !!user,
                    authLoading: loading
                  }, null, 2)}
                </pre>
              </div>
            )}
            
            <HeaderMenuItems 
              shouldRenderUserButtons={shouldRenderUserButtons}
              shouldRenderLoginButton={shouldRenderLoginButton}
              isAdmin={isAdmin}
              isServicePath={isServicePath}
              specialPathClasses={specialPathClasses}
              isLoading={loading}
              isMounted={isMounted}
              isMobile={false}
            />
          </nav>
        </div>

        {/* ✅ 모바일 메뉴 (완전히 숨김 보장) */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <nav className="flex flex-col space-y-4 p-4 border-t">
              <HeaderMenuItems 
                shouldRenderUserButtons={shouldRenderUserButtons}
                shouldRenderLoginButton={shouldRenderLoginButton}
                isAdmin={isAdmin}
                isServicePath={isServicePath}
                specialPathClasses={specialPathClasses}
                closeMenu={closeMenu}
                isLoading={loading}
                isMounted={isMounted}
                isMobile={true}
              />
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}