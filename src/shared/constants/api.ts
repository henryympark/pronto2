/**
 * API 경로 상수들
 */
export const API_PATHS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    SIGNUP: '/api/auth/signup',
    VERIFY: '/api/auth/verify',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  SERVICES: {
    LIST: '/api/services',
    DETAIL: (id: string) => `/api/services/${id}`,
    CREATE: '/api/services',
    UPDATE: (id: string) => `/api/services/${id}`,
    DELETE: (id: string) => `/api/services/${id}`,
  },
  RESERVATIONS: {
    LIST: '/api/reservations',
    DETAIL: (id: string) => `/api/reservations/${id}`,
    CREATE: '/api/reservations',
    UPDATE: (id: string) => `/api/reservations/${id}`,
    CANCEL: (id: string) => `/api/reservations/${id}/cancel`,
  },
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    USERS: '/api/admin/users',
    SERVICES: '/api/admin/services',
    RESERVATIONS: '/api/admin/reservations',
  },
} as const;