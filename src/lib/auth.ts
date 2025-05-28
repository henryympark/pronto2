/**
 * 권한 관리 유틸리티 함수들
 * JWT metadata 기반 권한 확인
 */

import { UserRole, Permission, Resource, AuthUser } from '@/types';

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(
  user: AuthUser | null,
  permission: Permission,
  resource?: Resource,
  ownerId?: string
): boolean {
  if (!user) return false;

  // 관리자는 모든 권한을 가짐
  if (user.role === 'admin') return true;

  // 일반 사용자는 자신의 데이터에만 접근 가능
  if (permission === 'read' || permission === 'write') {
    if (ownerId && user.id === ownerId) return true;
  }

  // 공개 읽기 권한 (서비스, 공개 리뷰 등)
  if (permission === 'read' && (resource === 'services' || resource === 'reviews')) {
    return true;
  }

  return false;
}

/**
 * 관리자 권한 확인
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

/**
 * 인증된 사용자인지 확인
 */
export function isAuthenticated(user: AuthUser | null): boolean {
  return !!user;
}

/**
 * 리소스 소유자인지 확인
 */
export function isOwner(user: AuthUser | null, ownerId: string): boolean {
  return user?.id === ownerId;
}

/**
 * 페이지 접근 권한 확인
 */
export function canAccessPage(
  user: AuthUser | null,
  pagePath: string
): boolean {
  // 공개 페이지
  const publicPages = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/services',
    '/about',
  ];

  if (publicPages.some(page => pagePath.startsWith(page))) {
    return true;
  }

  // 인증이 필요한 페이지
  if (!user) return false;

  // 관리자 페이지
  if (pagePath.startsWith('/admin')) {
    return user.role === 'admin';
  }

  // 사용자 페이지 (예약, 프로필 등)
  if (pagePath.startsWith('/reservations') || pagePath.startsWith('/profile')) {
    return true; // 인증된 사용자는 접근 가능
  }

  return false;
}

/**
 * JWT 토큰에서 사용자 역할 추출
 */
export function extractRoleFromJWT(token: any): UserRole {
  try {
    // JWT의 user_metadata에서 role 추출
    const role = token?.user_metadata?.role;
    return role === 'admin' ? 'admin' : 'customer';
  } catch (error) {
    console.error('JWT 역할 추출 오류:', error);
    return 'customer';
  }
}

/**
 * 권한 오류 메시지 생성
 */
export function getPermissionErrorMessage(
  permission: Permission,
  resource?: Resource
): string {
  const resourceName = resource ? getResourceName(resource) : '리소스';
  
  switch (permission) {
    case 'read':
      return `${resourceName}를 조회할 권한이 없습니다.`;
    case 'write':
      return `${resourceName}를 수정할 권한이 없습니다.`;
    case 'delete':
      return `${resourceName}를 삭제할 권한이 없습니다.`;
    case 'admin':
      return '관리자 권한이 필요합니다.';
    default:
      return '권한이 없습니다.';
  }
}

/**
 * 리소스 이름 한국어 변환
 */
function getResourceName(resource: Resource): string {
  switch (resource) {
    case 'customers':
      return '고객 정보';
    case 'reviews':
      return '리뷰';
    case 'reservations':
      return '예약';
    case 'services':
      return '서비스';
    default:
      return '리소스';
  }
} 