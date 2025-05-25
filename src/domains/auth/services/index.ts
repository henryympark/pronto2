// Auth 도메인 서비스 배럴 익스포트
// 인증 관련 모든 API 및 유틸리티 서비스들을 여기서 export

// 권한 관리 유틸리티
export * from './authUtils';

// 추후 추가될 Auth 서비스들
// export * from './authApi';      // API 호출 함수들
// export * from './sessionManager'; // 세션 관리 서비스
// export * from './oauthService';   // OAuth 통합 서비스

// 서비스 메타데이터
export const AUTH_SERVICES_META = {
  count: 1,
  available: ['authUtils'],
  planned: ['authApi', 'sessionManager', 'oauthService']
} as const;