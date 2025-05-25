// Auth 도메인 - 사용자 및 인증 관련 타입 정의
// 모든 Auth 관련 타입들을 통합 관리

// =================================
// 기본 사용자 타입
// =================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser extends User {
  role?: string;
  auth_provider?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

// =================================
// 인증 상태 타입
// =================================

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

// =================================
// 권한 관련 타입 (authUtils에서 가져온 것들)
// =================================

export interface UserRole {
  isAdmin: boolean;
  role: string;
  userId: string;
  email?: string;
  timestamp: number;
  source: 'cache' | 'database' | 'rpc' | 'default';
}

export interface AuthCheckResult {
  success: boolean;
  userRole: UserRole | null;
  error?: string;
  debugInfo?: any;
}

export type RoleType = 'admin' | 'customer' | 'guest';

// =================================
// 인증 폼 타입
// =================================

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
  terms: boolean;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =================================
// 프로필 관련 타입
// =================================

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: 'ko' | 'en';
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy?: {
    profileVisible: boolean;
    emailVisible: boolean;
  };
}

// =================================
// OAuth 관련 타입
// =================================

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface OAuthConfig {
  providers: OAuthProvider[];
  redirectUrl: string;
  scopes: string[];
}

// =================================
// 에러 타입
// =================================

export interface AuthError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'TOKEN_EXPIRED'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// =================================
// API 응답 타입
// =================================

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
  message?: string;
}

export interface LoginResponse extends AuthResponse {
  data?: {
    user: AuthUser;
    session: SessionData;
  };
}

export interface SignupResponse extends AuthResponse {
  data?: {
    user: AuthUser;
    confirmationRequired: boolean;
  };
}

// =================================
// 이벤트 타입
// =================================

export interface AuthEvent {
  type: 'SIGN_IN' | 'SIGN_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';
  user?: AuthUser | null;
  timestamp: number;
}

export type AuthEventHandler = (event: AuthEvent) => void;

// =================================
// 설정 타입
// =================================

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectUrl: string;
  sessionTimeout: number;
  autoRefresh: boolean;
  persistSession: boolean;
  debug: boolean;
}

// =================================
// 유틸리티 타입
// =================================

export type OptionalUser = User | null | undefined;
export type RequiredUser = Required<User>;

// 부분적 업데이트를 위한 타입
export type UserUpdate = Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
export type PreferencesUpdate = Partial<UserPreferences>;

// 타입 가드를 위한 함수들
export const isAuthenticated = (state: AuthState): state is AuthState & { user: AuthUser } => {
  return state.isAuthenticated && state.user !== null;
};

export const hasRole = (user: AuthUser | null, role: RoleType): boolean => {
  return user?.role === role;
};

export const isAdmin = (user: AuthUser | null): boolean => {
  return hasRole(user, 'admin');
};

// =================================
// 상수 타입
// =================================

export const AUTH_STORAGE_KEYS = {
  SESSION: 'pronto_auth_session',
  STATE: 'pronto_auth_state',
  PREFERENCES: 'pronto_user_preferences'
} as const;

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  RESET_PASSWORD: '/auth/reset-password',
  UPDATE_PASSWORD: '/auth/update-password',
  PROFILE: '/profile',
  LOGOUT: '/auth/logout'
} as const;

export const ROLE_HIERARCHY = {
  guest: 0,
  customer: 1,
  admin: 2
} as const;

// =================================
// 메타데이터
// =================================

export const AUTH_TYPES_META = {
  version: '1.0.0',
  description: 'Auth domain type definitions',
  totalTypes: 25,
  categories: {
    user: ['User', 'AuthUser', 'UserProfile'],
    auth: ['AuthState', 'SessionData', 'UserRole'],
    forms: ['LoginCredentials', 'SignupData', 'ResetPasswordData'],
    api: ['AuthResponse', 'LoginResponse', 'SignupResponse'],
    config: ['AuthConfig', 'OAuthConfig', 'UserPreferences'],
    errors: ['AuthError', 'AuthErrorCode'],
    events: ['AuthEvent', 'AuthEventHandler'],
    utils: ['OptionalUser', 'RequiredUser', 'UserUpdate']
  }
} as const;