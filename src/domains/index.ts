// 도메인 전체 배럴 익스포트
// 모든 도메인들을 통합하여 익스포트합니다

// Auth 도메인
export * from './auth';

// 추후 다른 도메인들 (studio, booking, review 등)이 여기에 추가됩니다
// export * from './studio';
// export * from './booking';
// export * from './review';

// 도메인 메타 정보
export const DOMAINS = {
  auth: 'Authentication and user management',
  // studio: 'Studio management and listings',
  // booking: 'Reservation and booking system',
  // review: 'Review and rating system'
} as const;
