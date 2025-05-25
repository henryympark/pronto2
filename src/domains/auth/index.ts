// Auth 도메인 메인 배럴 익스포트
// 모든 Auth 관련 모듈들을 통합하여 익스포트합니다

// 컴포넌트
export * from './components';

// 훅스
export * from './hooks';

// 서비스
export * from './services';

// 타입
export * from './types';

// 페이지
export * from './pages';

// 도메인 메타 정보
export const AUTH_DOMAIN = {
  name: 'auth',
  version: '1.0.0',
  description: 'Authentication domain with complete auth flow'
} as const;
