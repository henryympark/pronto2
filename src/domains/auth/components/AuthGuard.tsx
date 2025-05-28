// Auth 도메인 - 선언적 권한 관리 컴포넌트
// 복잡한 권한 체크 로직을 간단하게 만들어주는 통합 AuthGuard

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// =================================
// 타입 정의
// =================================

export interface AuthGuardProps {
  /** 자식 컴포넌트 */
  children: React.ReactNode;
  
  /** 필요한 권한 레벨 */
  requiredRole?: 'admin' | 'user' | 'guest';
  
  /** 권한이 없을 때 리디렉션할 경로 */
  fallback?: string;
  
  /** 로딩 중에 표시할 컴포넌트 */
  loadingComponent?: React.ReactNode;
  
  /** 권한이 없을 때 표시할 컴포넌트 (리디렉션 대신) */
  unauthorizedComponent?: React.ReactNode;
  
  /** 리디렉션 없이 권한 체크만 수행 */
  noRedirect?: boolean;
  
  /** 디버깅 모드 활성화 */
  debug?: boolean;
}

export interface AuthGuardState {
  isLoading: boolean;
  isAuthorized: boolean | null;
  userRole: 'admin' | 'customer' | null;
  error: string | null;
  checkCompleted: boolean;
}

// =================================
// 기본 설정
// =================================

const DEFAULT_CONFIG = {
  FALLBACK_PATHS: {
    admin: '/service/pronto-b',
    user: '/auth/login',
    guest: '/auth/login'
  },
  LOADING_DELAY: 100, // 100ms 후에 로딩 표시 (깜빡임 방지)
  REDIRECT_DELAY: 50   // 50ms 후에 리디렉션 (상태 안정화)
} as const;

// =================================
// 유틸리티 함수들
// =================================

function debugLog(component: string, message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    const prefix = `[AuthGuard:${component}]`;
    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

function getFallbackPath(requiredRole: string, customFallback?: string): string {
  if (customFallback) return customFallback;
  
  switch (requiredRole) {
    case 'admin':
      return DEFAULT_CONFIG.FALLBACK_PATHS.admin;
    case 'user':
      return DEFAULT_CONFIG.FALLBACK_PATHS.user;
    case 'guest':
    default:
      return DEFAULT_CONFIG.FALLBACK_PATHS.guest;
  }
}

// =================================
// 로딩 컴포넌트들
// =================================

function DefaultLoadingComponent(): React.JSX.Element {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-medium">권한 확인 중...</p>
        <p className="text-sm text-muted-foreground mt-2">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}

function CompactLoadingComponent(): React.JSX.Element {
  return (
    <div className="flex justify-center items-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function DefaultUnauthorizedComponent({ requiredRole }: { requiredRole: string }): React.JSX.Element {
  const roleText = requiredRole === 'admin' ? '관리자' : '로그인';
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">접근 권한이 없습니다</h1>
        <p className="text-muted-foreground mb-6">
          이 페이지에 접근하려면 {roleText} 권한이 필요합니다.
        </p>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          이전 페이지로
        </button>
      </div>
    </div>
  );
}

// =================================
// 메인 AuthGuard 컴포넌트
// =================================

export function AuthGuard({
  children,
  requiredRole = 'guest',
  fallback,
  loadingComponent,
  unauthorizedComponent,
  noRedirect = false,
  debug = false
}: AuthGuardProps): React.JSX.Element | null {
  
  // =================================
  // 상태 관리
  // =================================
  
  const [state, setState] = useState<AuthGuardState>({
    isLoading: true,
    isAuthorized: null,
    userRole: null,
    error: null,
    checkCompleted: false
  });
  
  // =================================
  // 훅 및 참조
  // =================================
  
  const { authUser, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // 중복 실행 방지
  const checkInProgress = useRef(false);
  const hasRedirected = useRef(false);
  const componentId = useRef(`guard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // 디버깅 로그
  const log = (message: string, data?: any) => {
    if (debug) {
      debugLog(componentId.current, message, data);
    }
  };
  
  // =================================
  // 권한 체크 로직 (JWT metadata 기반)
  // =================================
  
  const performAuthCheck = async (): Promise<void> => {
    // 중복 실행 방지
    if (checkInProgress.current) {
      log('권한 체크 이미 진행 중, 스킵');
      return;
    }
    
    checkInProgress.current = true;
    log('권한 체크 시작', { 
      requiredRole, 
      hasUser: !!authUser, 
      isAdmin,
      authLoading 
    });
    
    try {
      // 인증 로딩 중이면 대기
      if (authLoading) {
        log('인증 로딩 중, 대기');
        return;
      }
      
      let isAuthorized = false;
      let userRole: 'admin' | 'customer' | null = null;
      
      // 권한 확인 (JWT metadata 기반)
      if (authUser) {
        userRole = authUser.role;
        
        switch (requiredRole) {
          case 'admin':
            isAuthorized = isAdmin;
            break;
          case 'user':
            isAuthorized = true; // 로그인한 사용자면 접근 가능
            break;
          case 'guest':
            isAuthorized = true; // 게스트는 항상 접근 가능
            break;
          default:
            isAuthorized = false;
        }
      } else {
        // 로그인하지 않은 경우
        isAuthorized = requiredRole === 'guest';
      }
      
      log('권한 체크 완료', { 
        isAuthorized, 
        userRole,
        requiredRole 
      });
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthorized,
        userRole,
        checkCompleted: true,
        error: null
      }));
      
      // 권한이 없고 리디렉션이 필요한 경우
      if (!isAuthorized && !noRedirect && !hasRedirected.current) {
        await handleUnauthorized('권한 부족');
      }
      
    } catch (error) {
      log('권한 체크 오류', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthorized: false,
        error: error instanceof Error ? error.message : '권한 확인 중 오류가 발생했습니다',
        checkCompleted: true
      }));
      
      if (!noRedirect && !hasRedirected.current) {
        await handleUnauthorized('권한 체크 오류');
      }
    } finally {
      checkInProgress.current = false;
    }
  };
  
  // =================================
  // 권한 없음 처리
  // =================================
  
  const handleUnauthorized = async (reason: string): Promise<void> => {
    if (hasRedirected.current) {
      log('이미 리디렉션됨, 스킵');
      return;
    }
    
    hasRedirected.current = true;
    log('권한 없음 처리', { reason, requiredRole });
    
    const redirectPath = getFallbackPath(requiredRole, fallback);
    
    // 약간의 지연 후 리디렉션 (상태 안정화)
    setTimeout(() => {
      log('리디렉션 실행', { redirectPath });
      router.push(redirectPath);
    }, DEFAULT_CONFIG.REDIRECT_DELAY);
  };
  
  // =================================
  // 효과 훅
  // =================================
  
  useEffect(() => {
    log('AuthGuard 마운트', { requiredRole });
    
    // 권한 체크 실행
    performAuthCheck();
    
    return () => {
      log('AuthGuard 언마운트');
      checkInProgress.current = false;
    };
  }, [authUser, isAdmin, authLoading, requiredRole]);
  
  // =================================
  // 렌더링 로직
  // =================================
  
  // 로딩 중
  if (state.isLoading || authLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return <DefaultLoadingComponent />;
  }
  
  // 오류 발생
  if (state.error) {
    log('오류 상태 렌더링', { error: state.error });
    
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    
    return <DefaultUnauthorizedComponent requiredRole={requiredRole} />;
  }
  
  // 권한 없음
  if (state.checkCompleted && !state.isAuthorized) {
    log('권한 없음 상태 렌더링');
    
    if (noRedirect) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return <DefaultUnauthorizedComponent requiredRole={requiredRole} />;
    }
    
    // 리디렉션 중이면 로딩 표시
    return <CompactLoadingComponent />;
  }
  
  // 권한 있음 - 자식 컴포넌트 렌더링
  if (state.isAuthorized) {
    log('권한 확인됨, 자식 컴포넌트 렌더링');
    return <>{children}</>;
  }
  
  // 기본 로딩 상태
  return <DefaultLoadingComponent />;
}

// =================================
// 편의 컴포넌트들
// =================================

export function AdminOnly({ 
  children, 
  fallback,
  loadingComponent 
}: {
  children: React.ReactNode;
  fallback?: string;
  loadingComponent?: React.ReactNode;
}): React.JSX.Element {
  return (
    <AuthGuard 
      requiredRole="admin" 
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </AuthGuard>
  );
}

export function UserOnly({ 
  children, 
  fallback = '/auth/login',
  loadingComponent 
}: {
  children: React.ReactNode;
  fallback?: string;
  loadingComponent?: React.ReactNode;
}): React.JSX.Element {
  return (
    <AuthGuard 
      requiredRole="user" 
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </AuthGuard>
  );
}

export function ConditionalAuth({
  condition,
  children,
  fallback,
  unauthorizedComponent
}: {
  condition: boolean;
  children: React.ReactNode;
  fallback?: string;
  unauthorizedComponent?: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  
  useEffect(() => {
    if (!condition && fallback) {
      router.push(fallback);
    }
  }, [condition, fallback, router]);
  
  if (!condition) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    return <DefaultUnauthorizedComponent requiredRole="user" />;
  }
  
  return <>{children}</>;
}

// =================================
// 훅
// =================================

export function useUserRole() {
  const { authUser, isAdmin } = useAuth();
  
  return {
    userRole: authUser?.role || null,
    isAdmin,
    isAuthenticated: !!authUser,
    loading: false // JWT metadata 기반이므로 즉시 사용 가능
  };
}