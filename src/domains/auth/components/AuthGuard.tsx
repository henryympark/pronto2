// Auth 도메인 - 선언적 권한 관리 컴포넌트
// 복잡한 권한 체크 로직을 간단하게 만들어주는 통합 AuthGuard

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { getUserRole, clearUserCache, type UserRole } from '../services/authUtils';
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
  userRole: UserRole | null;
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
  
  const { user, loading: authLoading } = useAuth();
  const supabase = useSupabase();
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
  // 권한 체크 로직
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
      hasUser: !!user, 
      authLoading 
    });
    
    try {
      // AuthContext 로딩 대기
      if (authLoading) {
        log('AuthContext 로딩 중, 대기');
        return;
      }
      
      // 권한별 체크 로직
      switch (requiredRole) {
        case 'guest':
          // guest는 누구나 접근 가능
          log('게스트 권한 - 접근 허용');
          setState(prev => ({
            ...prev,
            isLoading: false,
            isAuthorized: true,
            checkCompleted: true
          }));
          break;
          
        case 'user':
          // 로그인된 사용자만 접근 가능
          if (!user) {
            log('로그인 필요 - 권한 없음');
            await handleUnauthorized('로그인이 필요합니다');
          } else {
            log('로그인된 사용자 - 접근 허용', { userId: user.id });
            setState(prev => ({
              ...prev,
              isLoading: false,
              isAuthorized: true,
              checkCompleted: true
            }));
          }
          break;
          
        case 'admin':
          // 관리자만 접근 가능
          if (!user) {
            log('관리자 권한 필요하지만 로그인되지 않음');
            await handleUnauthorized('로그인이 필요합니다');
          } else {
            // 통합 권한 유틸리티로 관리자 확인
            log('관리자 권한 확인 시작');
            const userRole = await getUserRole(supabase, user);
            
            log('관리자 권한 확인 완료', {
              isAdmin: userRole.isAdmin,
              role: userRole.role,
              source: userRole.source
            });
            
            setState(prev => ({
              ...prev,
              userRole,
              isLoading: false,
              checkCompleted: true
            }));
            
            if (userRole.isAdmin) {
              log('관리자 권한 확인됨 - 접근 허용');
              setState(prev => ({
                ...prev,
                isAuthorized: true
              }));
            } else {
              log('관리자 권한 없음');
              await handleUnauthorized('관리자 권한이 필요합니다');
            }
          }
          break;
          
        default:
          log('알 수 없는 권한 레벨', { requiredRole });
          await handleUnauthorized('잘못된 권한 설정입니다');
      }
      
    } catch (error) {
      log('권한 체크 중 오류 발생', { error });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '권한 확인 중 오류가 발생했습니다',
        checkCompleted: true
      }));
      
      await handleUnauthorized('권한 확인 중 오류가 발생했습니다');
    } finally {
      checkInProgress.current = false;
    }
  };
  
  // =================================
  // 권한 없음 처리
  // =================================
  
  const handleUnauthorized = async (reason: string): Promise<void> => {
    log('권한 없음 처리', { reason, noRedirect });
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      isAuthorized: false,
      error: reason,
      checkCompleted: true
    }));
    
    // 리디렉션이 비활성화된 경우 여기서 중단
    if (noRedirect || hasRedirected.current) {
      return;
    }
    
    // 리디렉션 처리
    hasRedirected.current = true;
    const redirectPath = getFallbackPath(requiredRole, fallback);
    
    log('리디렉션 실행', { path: redirectPath });
    
    // 약간의 지연 후 리디렉션 (상태 안정화)
    setTimeout(() => {
      try {
        router.push(redirectPath);
      } catch (routerError) {
        log('router.push 실패, window.location 사용', { routerError });
        window.location.href = redirectPath;
      }
    }, DEFAULT_CONFIG.REDIRECT_DELAY);
  };
  
  // =================================
  // Effect: 권한 체크 실행
  // =================================
  
  useEffect(() => {
    log('useEffect 실행', { 
      authLoading, 
      hasUser: !!user, 
      checkCompleted: state.checkCompleted 
    });
    
    // 이미 체크 완료된 경우 스킵
    if (state.checkCompleted) {
      return;
    }
    
    // AuthContext 로딩 중이면 대기
    if (authLoading) {
      return;
    }
    
    // 권한 체크 실행
    performAuthCheck();
    
  }, [authLoading, user, requiredRole]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // =================================
  // Effect: 사용자 변경 시 캐시 클리어
  // =================================
  
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 사용자 캐시 클리어 (선택적)
      if (user?.id) {
        clearUserCache(user.id);
        log('컴포넌트 언마운트 - 사용자 캐시 클리어', { userId: user.id });
      }
    };
  }, [user?.id, log]);
  
  // =================================
  // 렌더링 로직
  // =================================
  
  // 로딩 중
  if (state.isLoading) {
    log('로딩 컴포넌트 렌더링');
    
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    // 컴팩트한 로딩 vs 전체 화면 로딩
    const isCompactLayout = requiredRole === 'guest' || 
                           (requiredRole === 'user' && user);
    
    return isCompactLayout ? <CompactLoadingComponent /> : <DefaultLoadingComponent />;
  }
  
  // 권한 없음
  if (state.isAuthorized === false) {
    log('권한 없음 컴포넌트 렌더링', { noRedirect });
    
    // 사용자 정의 권한 없음 컴포넌트가 있으면 사용
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    
    // 리디렉션이 비활성화된 경우에만 기본 컴포넌트 표시
    if (noRedirect) {
      return <DefaultUnauthorizedComponent requiredRole={requiredRole} />;
    }
    
    // 리디렉션이 활성화된 경우 null 반환 (리디렉션 진행 중)
    return null;
  }
  
  // 권한 확인됨 - 자식 컴포넌트 렌더링
  if (state.isAuthorized === true) {
    log('자식 컴포넌트 렌더링');
    return <>{children}</>;
  }
  
  // 예상치 못한 상태
  log('예상치 못한 상태', { state });
  return null;
}

// =================================
// 추가 유틸리티 컴포넌트들
// =================================

/**
 * 관리자 전용 래퍼 컴포넌트
 */
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

/**
 * 로그인 사용자 전용 래퍼 컴포넌트
 */
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

/**
 * 조건부 권한 체크 컴포넌트
 */
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
  if (condition) {
    return <>{children}</>;
  }
  
  if (unauthorizedComponent) {
    return <>{unauthorizedComponent}</>;
  }
  
  if (fallback) {
    // 즉시 리디렉션
    if (typeof window !== 'undefined') {
      window.location.href = fallback;
    }
  }
  
  return <DefaultUnauthorizedComponent requiredRole="custom" />;
}

// =================================
// 훅: 권한 정보 사용
// =================================

/**
 * 현재 사용자의 권한 정보를 가져오는 훅
 */
export function useUserRole() {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }
      
      try {
        const role = await getUserRole(supabase, user);
        setUserRole(role);
      } catch (error) {
        console.error('권한 정보 조회 실패:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRole();
  }, [user, supabase]);
  
  return { userRole, loading };
}

export default AuthGuard;