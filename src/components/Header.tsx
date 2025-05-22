"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, User, Settings, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const pathname = usePathname(); // Next.js 13+ 방식으로 현재 경로 가져오기
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 서비스 경로를 클라이언트 측에서만 체크하기 위한 상태
  const [isServicePath, setIsServicePath] = useState(false);
  
  // AuthContext에서 isAdmin 상태 직접 사용
  const { user, loading, signOut, isAdmin } = useAuth();
  
  // 컴포넌트가 마운트되었는지 확인
  useEffect(() => {
    setMounted(true);
    
    // 마운트된 후에 서비스 경로인지 확인
    if (pathname && pathname.includes('/service/')) {
      setIsServicePath(true);
    } else {
      setIsServicePath(false);
    }
    
    // 이 효과는 컴포넌트가 마운트될 때마다 실행되므로, 페이지 전환 후에도 mounted 상태를 유지합니다
    console.log("[Header] 컴포넌트 마운트됨");
    
  }, [pathname]);
  
  // 인증 상태 디버깅을 위한 로그
  useEffect(() => {
    if (mounted) {
      console.log("[Header] Auth 상태:", { 
        userId: user?.id,
        email: user?.email,
        loading, 
        mounted, 
        isAdmin,
        pathname,
        isServicePath
      });
    }
  }, [user, loading, mounted, isAdmin, pathname, isServicePath]);

  // 어드민 페이지로 이동하는 함수
  const handleAdminClick = () => {
    try {
      console.log('[Header] 어드민 버튼 클릭됨 - 어드민 페이지로 이동, isAdmin 상태:', isAdmin);
      
      // 먼저 root 어드민 페이지로 이동 - 자체 검증 로직을 통해 적절하게 리디렉션 하도록
      router.push('/admin');
      
      // 추가 로깅 - 디버깅용
      setTimeout(() => {
        console.log('[Header] 어드민 버튼 router.push 후 상태 (전환이 느린 경우 확인용)');
      }, 500);
    } catch (error) {
      console.error('[Header] 어드민 페이지 이동 오류:', error);
      
      // 직접적인 접근 시도 (백업 방법)
      try {
        window.location.href = '/admin';
      } catch (fallbackError) {
        console.error('[Header] 대체 네비게이션 방법도 실패:', fallbackError);
        alert('페이지 이동 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 로그인 페이지로 이동하는 함수
  const handleLoginClick = () => {
    try {
      console.log('[Header] 로그인 버튼 클릭됨 - 로그인 페이지로 이동');
      router.push('/auth/login');
    } catch (error) {
      console.error('[Header] 로그인 페이지 이동 오류:', error);
      window.location.href = '/auth/login';
    }
  };
  
  // 마이페이지로 이동하는 함수
  const handleMyPageClick = () => {
    try {
      console.log('[Header] 마이페이지 버튼 클릭됨 - 마이페이지로 이동');
      router.push('/my');
    } catch (error) {
      console.error('[Header] 마이페이지 이동 오류:', error);
      window.location.href = '/my';
    }
  };
  
  // 로그아웃 처리 함수
  const handleSignOut = async () => {
    try {
      console.log('[Header] 로그아웃 시작');
      await signOut();
      // 로그아웃 표시를 위해 타임스탬프 추가
      router.push(`/auth/login?t=${Date.now()}`);
    } catch (error) {
      console.error('[Header] 로그아웃 처리 중 오류:', error);
    }
  };
  
  // 사용자 관련 버튼 렌더링을 위한 조건 - 명시적으로 Boolean 타입으로 변환
  const shouldRenderUserButtons = mounted && !loading && !!user;
  const shouldRenderLoginButton = mounted && !loading && !user;
  
  // 렌더링 직전 상태 로깅
  console.log('[Header] 렌더링 직전 상태:', { 
    userId: user?.id,
    isLoadingContext: loading, 
    isUserAdmin: isAdmin,
    isComponentMounted: mounted,
    // 계산된 노출 조건 변수들
    shouldRenderUserButtons,
    shouldRenderLoginButton,
    pathname,
    isServicePath
  });
  
  // 클라이언트에서만 특별한 스타일을 적용하기 위해 Tailwind 클래스와 인라인 스타일 조합 사용
  const buttonSpecialStyles = mounted && isServicePath ? {
    // display: 'inline-block',
    visibility: 'visible' as const,
    opacity: 1
  } : {};
  
  return (
    <header className="flex items-center justify-between bg-white shadow-sm h-16 px-4 relative z-[100]">
      {/* 로고 */}
      <Link href="/" className="font-bold text-pronto-primary text-xl">
        Pronto
      </Link>
      
      {/* 데스크톱 메뉴 (md 이상) - 마운트 이후에만 특별 스타일 적용 */}
      <div className="hidden md:flex items-center space-x-4">
        <nav className="flex items-center space-x-4">
          {shouldRenderUserButtons && (
            <>
              {/* 로그인한 경우 */}
              <Button
                onClick={handleMyPageClick}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-pronto-primary"
                style={buttonSpecialStyles}
              >
                <User className="h-4 w-4 mr-1" />
                마이페이지
              </Button>
              
              {isAdmin && (
                <Button
                  onClick={handleAdminClick}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-pronto-primary"
                  style={buttonSpecialStyles}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  어드민
                </Button>
              )}
              
              <Button
                onClick={handleSignOut}
                size="sm"
                variant="outline"
                style={buttonSpecialStyles}
              >
                로그아웃
              </Button>
            </>
          )}
          
          {shouldRenderLoginButton && (
            /* 로그인하지 않은 경우 - 로딩 완료되었을 때만 표시 */
            <Button
              onClick={handleLoginClick}
              size="sm"
              className="bg-pronto-primary hover:bg-pronto-primary/90"
              style={buttonSpecialStyles}
            >
              <LogIn className="h-4 w-4 mr-1" />
              로그인
            </Button>
          )}
          
          {/* 로딩 중일 때 표시 */}
          {(!mounted || loading) && (
            <span className="text-sm text-gray-500">로딩 중...</span>
          )}
        </nav>
      </div>
      
      {/* 모바일 메뉴 토글 (md 미만) */}
      <button 
        className="block md:hidden text-gray-600"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? 
          <X className="h-6 w-6" /> : 
          <Menu className="h-6 w-6" />}
      </button>
      
      {/* 모바일 메뉴 드롭다운 */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white shadow-md z-50 md:hidden">
          <nav className="flex flex-col p-4 space-y-3">
            {shouldRenderUserButtons && (
              <>
                <Button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleMyPageClick();
                  }}
                  variant="ghost"
                  className="text-sm font-medium text-pronto-primary hover:text-pronto-primary hover:bg-pronto-primary/10 flex items-center justify-start p-2 h-auto w-full"
                  style={buttonSpecialStyles}
                >
                  <User className="h-4 w-4 mr-1" />
                  마이페이지
                </Button>
                
                {isAdmin && (
                  <Button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleAdminClick();
                    }}
                    variant="ghost"
                    className="text-sm font-medium text-pronto-primary hover:text-pronto-primary hover:bg-pronto-primary/10 flex items-center justify-start p-2 h-auto w-full"
                    style={buttonSpecialStyles}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    어드민
                  </Button>
                )}
                
                <Button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignOut();
                  }}
                  variant="ghost"
                  className="text-sm font-medium text-pronto-primary hover:text-pronto-primary hover:bg-pronto-primary/10 flex items-center justify-start p-2 h-auto w-full"
                  style={buttonSpecialStyles}
                >
                  로그아웃
                </Button>
              </>
            )}
            
            {shouldRenderLoginButton && (
              <Button 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLoginClick();
                }}
                variant="ghost"
                className="text-sm font-medium text-pronto-primary hover:text-pronto-primary hover:bg-pronto-primary/10 flex items-center justify-start p-2 h-auto w-full"
                style={buttonSpecialStyles}
              >
                <LogIn className="h-4 w-4 mr-1" />
                로그인
              </Button>
            )}
            
            {/* 로딩 중일 때 표시 */}
            {(!mounted || loading) && (
              <span className="text-sm text-gray-500">로딩 중...</span>
            )}
          </nav>
        </div>
      )}
    </header>
  );
} 