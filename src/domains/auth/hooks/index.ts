// Auth 도메인 훅스 배럴 익스포트
// 인증 관련 모든 커스텀 훅들을 여기서 export

// 핵심 Auth 훅
export { useHeaderAuth } from './useHeaderAuth';

// 기존 AuthContext의 useAuth 훅 re-export
export { useAuth } from '@/contexts/AuthContext';

// 추후 추가될 Auth 훅들
// export { useSession } from './useSession';    // 세션 관리 훅
// export { useAuthGuard } from './useAuthGuard'; // 인증 보호 훅

// 훅 메타데이터
export const AUTH_HOOKS_META = {
  count: 2,
  available: ['useHeaderAuth', 'useAuth'],
  planned: ['useSession', 'useAuthGuard']
} as const;