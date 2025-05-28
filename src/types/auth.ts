/**
 * 인증 및 권한 관련 타입 정의
 */

import { UserRole, Permission, Resource } from './index';

/**
 * 인증 컨텍스트 타입
 */
export interface AuthContextType {
  user: any | null; // Supabase User 타입
  authUser: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * 인증된 사용자 정보 타입 (JWT metadata 기반)
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  nickname?: string;
}

/**
 * JWT 페이로드 타입
 */
export interface JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email: string;
  phone: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    role?: UserRole;
  };
  role: string;
}

/**
 * 권한 확인 함수 타입
 */
export type PermissionChecker = (permission: Permission) => boolean;

/**
 * 리소스별 권한 확인 함수 타입
 */
export type ResourcePermissionChecker = (resource: Resource, permission: Permission) => boolean;

/**
 * 인증 상태 타입
 */
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * 로그인 폼 데이터 타입
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * 회원가입 폼 데이터 타입
 */
export interface SignUpFormData {
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
}

/**
 * 권한 확인 옵션 타입
 */
export interface PermissionOptions {
  /** 리소스 타입 */
  resource?: Resource;
  /** 필요한 권한 */
  permission: Permission;
  /** 리소스 소유자 ID (개인 데이터 접근 시) */
  ownerId?: string;
}

/**
 * 미들웨어 권한 확인 결과 타입
 */
export interface MiddlewareAuthResult {
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 관리자 여부 */
  isAdmin: boolean;
  /** 사용자 ID */
  userId?: string;
  /** 사용자 역할 */
  userRole?: UserRole;
  /** 리디렉션 URL (권한 없을 시) */
  redirectUrl?: string;
} 