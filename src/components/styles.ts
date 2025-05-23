/**
 * 헤더와 관련 컴포넌트의 스타일 상수 정의
 */

// 헤더 스타일 
export const headerStyles = {
  container: "sticky top-0 z-50 w-full bg-white shadow-sm",
  innerContainer: "container flex h-16 items-center px-4 md:px-6",
  
  // 로고 영역
  logoContainer: "flex items-center",
  logo: "flex items-center mr-6",
  logoText: "text-2xl font-bold tracking-tighter text-black",
  
  // 내비게이션 영역
  desktopNav: "hidden md:flex md:flex-1 md:items-center md:justify-end md:space-x-4",
  mobileMenuButtonContainer: "flex flex-1 items-center justify-end md:hidden",
  mobileNavContainer: "container md:hidden",
  mobileNav: "flex flex-col space-y-4 p-4",
};

// 메뉴 아이템 스타일
export const menuItemStyles = {
  // 버튼 기본 스타일
  baseButton: "flex items-center justify-center",
  mobileButton: "w-full",
  
  // 서비스 페이지 관련 스타일
  servicePath: "text-primary border-primary hover:bg-primary/10",
  
  // 로딩 표시 스타일
  loadingText: "text-sm text-gray-500",
  
  // 아이콘 스타일
  icon: "mr-2 h-4 w-4",
}; 