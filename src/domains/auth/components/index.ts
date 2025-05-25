// Auth 도메인 컴포넌트 배럴 익스포트
// 인증 관련 모든 UI 컴포넌트들을 여기서 export

// 권한 관리 컴포넌트
export { 
  AuthGuard, 
  AdminOnly, 
  UserOnly, 
  ConditionalAuth,
  useUserRole,
  type AuthGuardProps,
  type AuthGuardState
} from './AuthGuard';

// 추후 추가될 Auth 컴포넌트들
// export { LoginForm } from './LoginForm';     // 로그인 폼
// export { SignupForm } from './SignupForm';   // 회원가입 폼
// export { ProfileCard } from './ProfileCard'; // 사용자 프로필 카드

// 컴포넌트 메타데이터
export const AUTH_COMPONENTS_META = {
  count: 1,
  available: ['AuthGuard', 'AdminOnly', 'UserOnly', 'ConditionalAuth'],
  hooks: ['useUserRole'],
  planned: ['LoginForm', 'SignupForm', 'ProfileCard']
} as const;