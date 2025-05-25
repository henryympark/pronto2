// Auth 도메인 타입 배럴 익스포트
// 모든 Auth 관련 타입 정의들을 여기서 export

// 메인 Auth 타입들
export * from './auth';

// 추후 추가될 타입 파일들
// export * from './forms';    // 폼 관련 상세 타입
// export * from './api';      // API 관련 상세 타입
// export * from './events';   // 이벤트 관련 상세 타입

// 타입 메타데이터
export const AUTH_TYPES_SUMMARY = {
  totalFiles: 1,
  totalTypes: 25,
  mainCategories: [
    'User & Profile',
    'Authentication State', 
    'Permissions & Roles',
    'Forms & Validation',
    'API Responses',
    'Configuration',
    'Error Handling',
    'Events & Utilities'
  ],
  planned: ['forms.ts', 'api.ts', 'events.ts']
} as const;