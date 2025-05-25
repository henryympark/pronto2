// Auth 도메인 메인 배럴 익스포트
// 모든 Auth 관련 모듈들을 통합하여 익스포트합니다

// 컴포넌트
export * from './components';

// 훅스
export * from './hooks';

// 서비스
export * from './services';

// 타입들 (실제 존재하는 타입만 명시적 export)
export type {
  // User types
  User,
  AuthUser,
  UserRole,
  UserProfile,
  UserPreferences,
  
  // Authentication types
  AuthState,
  SessionData,
  LoginCredentials,
  SignupData,
  ResetPasswordData,
  UpdatePasswordData,
  
  // Permission types
  AuthCheckResult,
  RoleType,
  
  // API types
  AuthResponse,
  LoginResponse,
  SignupResponse,
  
  // OAuth types
  OAuthProvider,
  OAuthConfig,
  
  // Error types
  AuthError,
  AuthErrorCode,
  
  // Event types
  AuthEvent,
  AuthEventHandler,
  
  // Configuration types
  AuthConfig,
  
  // Utility types
  OptionalUser,
  RequiredUser,
  UserUpdate,
  PreferencesUpdate
} from './types';

// 추후 페이지 로직 추가
// export * from './pages';

// 도메인 메타 정보
export const AUTH_DOMAIN_INFO = {
  name: 'auth',
  version: '2.0.0',
  description: 'Complete authentication domain with hooks, components, services and types',
  features: [
    'Unified permission management',
    'Header authentication hook',
    'AuthGuard components',
    'Role-based access control',
    'Session management',
    'Type-safe API'
  ],
  modules: {
    hooks: ['useHeaderAuth'],
    components: ['AuthGuard', 'AdminOnly', 'UserOnly', 'ConditionalAuth'],
    services: ['authUtils with 15+ functions'],
    types: ['25+ comprehensive type definitions'],
    utils: ['Cache management', 'Role hierarchy', 'Type guards']
  },
  migration: {
    from: 'src/hooks/useHeaderAuth.ts → src/domains/auth/hooks/',
    authUtils: 'src/lib/auth-utils.ts → src/domains/auth/services/',
    authGuard: 'src/components/auth/AuthGuard.tsx → src/domains/auth/components/'
  }
} as const;