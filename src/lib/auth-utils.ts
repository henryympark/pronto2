// src/lib/auth-utils.ts
// 통합 권한 관리 유틸리티 - 모든 권한 체크 로직을 여기서 관리

import { SupabaseClient, User } from '@supabase/supabase-js';

// =================================
// 타입 정의
// =================================
export interface UserRole {
  isAdmin: boolean;
  role: string;
  userId: string;
  email?: string;
  timestamp: number;
  source: 'cache' | 'email' | 'database' | 'rpc' | 'default';
}

export interface AuthCheckResult {
  success: boolean;
  userRole: UserRole | null;
  error?: string;
  debugInfo?: any;
}

// =================================
// 메모리 캐시 관리
// =================================
class RoleCache {
  private cache = new Map<string, UserRole>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분
  
  get(userId: string): UserRole | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    // 캐시 만료 확인
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached;
  }
  
  set(userId: string, role: UserRole): void {
    this.cache.set(userId, {
      ...role,
      timestamp: Date.now()
    });
  }
  
  delete(userId: string): void {
    this.cache.delete(userId);
  }
  
  clear(): void {
    this.cache.clear();
    
    // 디버깅용 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthUtils] 권한 캐시 전체 클리어됨');
    }
  }
  
  size(): number {
    return this.cache.size;
  }
  
  // 만료된 캐시 정리
  cleanup(): void {
    const now = Date.now();
    this.cache.forEach((role, userId) => {
        if (now - role.timestamp > this.CACHE_DURATION) {
          this.cache.delete(userId);
        }
      });
  }
}

// 전역 캐시 인스턴스
const roleCache = new RoleCache();

// =================================
// 설정 및 상수
// =================================
const AUTH_CONFIG = {
  // 하드코딩된 관리자 이메일 목록
  ADMIN_EMAILS: ['admin@pronto.com', 'henry.ympark@gmail.com'] as string[],
  
  // 캐시 설정
  CACHE_DURATION: 5 * 60 * 1000, // 5분
  
  // RPC 함수명
  RPC_FUNCTIONS: {
    CHECK_ADMIN: 'check_admin_access',
    GET_ROLE: 'get_customer_role'
  },
  
  // 기본 역할
  DEFAULT_ROLE: 'customer',
  ADMIN_ROLE: 'admin'
} as const;

// =================================
// 디버깅 유틸리티
// =================================
function debugLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    if (data !== undefined) {
      console.log(`[AuthUtils] ${message}`, data);
    } else {
      console.log(`[AuthUtils] ${message}`);
    }
  }
}

// =================================
// 권한 체크 함수들
// =================================

/**
 * 1단계: 캐시에서 권한 정보 확인
 */
function checkCache(userId: string): UserRole | null {
  const cached = roleCache.get(userId);
  if (cached) {
    debugLog('캐시에서 권한 정보 발견', { 
      userId, 
      isAdmin: cached.isAdmin, 
      source: cached.source 
    });
    return { ...cached, source: 'cache' };
  }
  return null;
}

/**
 * 2단계: 하드코딩된 관리자 이메일 확인 (가장 빠른 체크)
 */
function checkAdminEmail(user: User): UserRole | null {
  const email = user.email?.toLowerCase();
  if (!email) return null;
  
  const isAdminEmail = AUTH_CONFIG.ADMIN_EMAILS.includes(email);
  
  if (isAdminEmail) {
    debugLog('관리자 이메일 확인됨', { email });
    return {
      isAdmin: true,
      role: AUTH_CONFIG.ADMIN_ROLE,
      userId: user.id,
      email: email,
      timestamp: Date.now(),
      source: 'email'
    };
  }
  
  return null;
}

/**
 * 3단계: customers 테이블에서 직접 역할 조회 (신뢰성 높음)
 */
async function checkCustomersTable(
  supabase: SupabaseClient, 
  user: User
): Promise<UserRole | null> {
  try {
    debugLog('customers 테이블 조회 시작', { userId: user.id });
    
    const { data: customer, error } = await supabase
      .from('customers')
      .select('role, email')
      .eq('id', user.id)
      .single();
    
    if (error) {
      debugLog('customers 테이블 조회 오류', { 
        error: error.message, 
        code: error.code 
      });
      return null;
    }
    
    if (!customer) {
      debugLog('customers 테이블에서 사용자 정보 없음');
      return null;
    }
    
    const role = customer.role || AUTH_CONFIG.DEFAULT_ROLE;
    const isAdmin = role === AUTH_CONFIG.ADMIN_ROLE;
    
    debugLog('customers 테이블에서 권한 정보 확인', { 
      role, 
      isAdmin,
      email: customer.email 
    });
    
    return {
      isAdmin,
      role,
      userId: user.id,
      email: user.email || customer.email,
      timestamp: Date.now(),
      source: 'database'
    };
    
  } catch (error) {
    debugLog('customers 테이블 조회 예외', { error });
    return null;
  }
}

/**
 * 4단계: RPC 함수로 권한 확인 (백업용)
 */
async function checkRpcFunction(
  supabase: SupabaseClient, 
  user: User
): Promise<UserRole | null> {
  try {
    debugLog('RPC 함수 호출 시작', { userId: user.id });
    
    // get_customer_role RPC 함수 호출
    const { data: roleData, error: roleError } = await supabase
      .rpc(AUTH_CONFIG.RPC_FUNCTIONS.GET_ROLE, { user_id: user.id });
    
    if (!roleError && roleData) {
      const role = roleData;
      const isAdmin = role === AUTH_CONFIG.ADMIN_ROLE;
      
      debugLog('RPC 함수에서 권한 정보 확인', { role, isAdmin });
      
      return {
        isAdmin,
        role,
        userId: user.id,
        email: user.email,
        timestamp: Date.now(),
        source: 'rpc'
      };
    }
    
    debugLog('RPC 함수 호출 실패', { error: roleError?.message });
    return null;
    
  } catch (error) {
    debugLog('RPC 함수 호출 예외', { error });
    return null;
  }
}

/**
 * 5단계: 기본값 반환
 */
function getDefaultRole(user: User): UserRole {
  debugLog('기본 권한 정보 반환', { userId: user.id });
  
  return {
    isAdmin: false,
    role: AUTH_CONFIG.DEFAULT_ROLE,
    userId: user.id,
    email: user.email,
    timestamp: Date.now(),
    source: 'default'
  };
}

// =================================
// 메인 권한 체크 함수
// =================================

/**
 * 사용자의 권한 정보를 종합적으로 확인
 * 
 * @param supabase Supabase 클라이언트
 * @param user 사용자 정보 (선택적)
 * @returns 권한 정보
 */
export async function getUserRole(
  supabase: SupabaseClient, 
  user?: User | null
): Promise<UserRole> {
  try {
    // 사용자 정보가 없으면 현재 인증된 사용자 가져오기
    if (!user) {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) {
        debugLog('인증된 사용자 없음');
        return {
          isAdmin: false,
          role: AUTH_CONFIG.DEFAULT_ROLE,
          userId: '',
          timestamp: Date.now(),
          source: 'default'
        };
      }
      user = currentUser;
    }
    
    debugLog('권한 체크 시작', { userId: user.id, email: user.email });
    
    // 1단계: 캐시 확인
    const cachedRole = checkCache(user.id);
    if (cachedRole) {
      return cachedRole;
    }
    
    // 2단계: 관리자 이메일 확인
    const emailRole = checkAdminEmail(user);
    if (emailRole) {
      roleCache.set(user.id, emailRole);
      return emailRole;
    }
    
    // 3단계: customers 테이블 확인
    const dbRole = await checkCustomersTable(supabase, user);
    if (dbRole) {
      roleCache.set(user.id, dbRole);
      return dbRole;
    }
    
    // 4단계: RPC 함수 확인 (백업)
    const rpcRole = await checkRpcFunction(supabase, user);
    if (rpcRole) {
      roleCache.set(user.id, rpcRole);
      return rpcRole;
    }
    
    // 5단계: 기본값 반환
    const defaultRole = getDefaultRole(user);
    roleCache.set(user.id, defaultRole);
    return defaultRole;
    
  } catch (error) {
    debugLog('권한 체크 중 예외 발생', { error });
    
    // 오류 발생 시 안전한 기본값 반환
    return {
      isAdmin: false,
      role: AUTH_CONFIG.DEFAULT_ROLE,
      userId: user?.id || '',
      email: user?.email,
      timestamp: Date.now(),
      source: 'default'
    };
  }
}

/**
 * 현재 사용자가 관리자인지 빠르게 확인
 * 
 * @param supabase Supabase 클라이언트
 * @param user 사용자 정보 (선택적)
 * @returns 관리자 여부
 */
export async function isAdmin(
  supabase: SupabaseClient, 
  user?: User | null
): Promise<boolean> {
  const role = await getUserRole(supabase, user);
  return role.isAdmin;
}

/**
 * 특정 사용자 ID로 권한 확인
 * 
 * @param supabase Supabase 클라이언트  
 * @param userId 사용자 ID
 * @returns 권한 정보
 */
export async function getUserRoleById(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  // 캐시 확인
  const cachedRole = checkCache(userId);
  if (cachedRole) {
    return cachedRole;
  }
  
  try {
    // 사용자 정보 조회
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) {
      debugLog('사용자 정보 조회 실패', { userId, error: error?.message });
      return {
        isAdmin: false,
        role: AUTH_CONFIG.DEFAULT_ROLE,
        userId,
        timestamp: Date.now(),
        source: 'default'
      };
    }
    
    return await getUserRole(supabase, user);
    
  } catch (error) {
    debugLog('사용자 ID로 권한 확인 중 예외', { userId, error });
    return {
      isAdmin: false,
      role: AUTH_CONFIG.DEFAULT_ROLE,
      userId,
      timestamp: Date.now(),
      source: 'default'
    };
  }
}

/**
 * 권한 정보를 강제로 새로고침 (캐시 무시)
 * 
 * @param supabase Supabase 클라이언트
 * @param user 사용자 정보 (선택적)
 * @returns 새로운 권한 정보
 */
export async function refreshUserRole(
  supabase: SupabaseClient,
  user?: User | null
): Promise<UserRole> {
  if (!user) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return {
        isAdmin: false,
        role: AUTH_CONFIG.DEFAULT_ROLE,
        userId: '',
        timestamp: Date.now(),
        source: 'default'
      };
    }
    user = currentUser;
  }
  
  // 캐시에서 제거
  roleCache.delete(user.id);
  
  debugLog('권한 정보 강제 새로고침', { userId: user.id });
  
  // 새로 조회
  return await getUserRole(supabase, user);
}

// =================================
// 캐시 관리 함수들
// =================================

/**
 * 권한 캐시 전체 클리어 (로그아웃 시 사용)
 */
export function clearRoleCache(): void {
  roleCache.clear();
}

/**
 * 특정 사용자의 캐시 제거
 */
export function clearUserCache(userId: string): void {
  roleCache.delete(userId);
  debugLog('사용자 캐시 제거됨', { userId });
}

/**
 * 만료된 캐시 정리
 */
export function cleanupCache(): void {
  roleCache.cleanup();
  debugLog('만료된 캐시 정리 완료', { cacheSize: roleCache.size() });
}

/**
 * 캐시 상태 정보 조회 (디버깅용)
 */
export function getCacheInfo(): { size: number; duration: number } {
  return {
    size: roleCache.size(),
    duration: AUTH_CONFIG.CACHE_DURATION
  };
}

// =================================
// 유틸리티 함수들
// =================================

/**
 * 관리자 이메일 목록에 이메일 추가 (런타임)
 * 주의: 이 함수는 개발/테스트 환경에서만 사용하세요
 */
export function addAdminEmail(email: string): void {
    if (process.env.NODE_ENV === 'development') {
      (AUTH_CONFIG.ADMIN_EMAILS as string[]).push(email.toLowerCase());
      debugLog('관리자 이메일 추가됨', { email });
    } else {
      console.warn('[AuthUtils] 프로덕션 환경에서는 관리자 이메일을 런타임에 추가할 수 없습니다.');
    }
  }

/**
 * 현재 설정 정보 조회
 */
export function getAuthConfig(): typeof AUTH_CONFIG {
  return { ...AUTH_CONFIG };
}

/**
 * 권한 체크 상세 정보 (디버깅용)
 */
export async function debugUserRole(
  supabase: SupabaseClient,
  user?: User | null
): Promise<AuthCheckResult> {
  try {
    if (!user) {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) {
        return {
          success: false,
          userRole: null,
          error: '인증된 사용자 없음',
          debugInfo: { error: error?.message }
        };
      }
      user = currentUser;
    }
    
    const startTime = Date.now();
    
    // 각 단계별로 확인
    const steps = {
      cache: checkCache(user.id),
      email: checkAdminEmail(user),
      database: await checkCustomersTable(supabase, user).catch(() => null),
      rpc: await checkRpcFunction(supabase, user).catch(() => null)
    };
    
    const finalRole = await getUserRole(supabase, user);
    const endTime = Date.now();
    
    return {
      success: true,
      userRole: finalRole,
      debugInfo: {
        userId: user.id,
        email: user.email,
        executionTime: endTime - startTime,
        steps,
        cacheInfo: getCacheInfo()
      }
    };
    
  } catch (error) {
    return {
      success: false,
      userRole: null,
      error: error instanceof Error ? error.message : String(error),
      debugInfo: { error }
    };
  }
}

// =================================
// 초기화 및 정리
// =================================

/**
 * 정기적으로 만료된 캐시 정리 (선택적)
 */
if (typeof window !== 'undefined') {
  // 브라우저 환경에서만 실행
  setInterval(() => {
    cleanupCache();
  }, 10 * 60 * 1000); // 10분마다
}