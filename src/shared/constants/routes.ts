/**
 * 애플리케이션 라우트 상수들
 */
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup',
    VERIFY: '/auth/verify',
    RESET_PASSWORD: '/password/reset',
    FORGOT_PASSWORD: '/password/forgot',
  },
  SERVICES: {
    LIST: '/service',
    DETAIL: (id: string) => `/service/${id}`,
  },
  USER: {
    PROFILE: '/my/profile',
    RESERVATIONS: '/my/reservations',
    SETTINGS: '/my/settings',
  },
  ADMIN: {
    DASHBOARD: '/admin',
    SERVICES: '/admin/services',
    RESERVATIONS: '/admin/reservations',
    USERS: '/admin/users',
  },
  PAYMENT: {
    SUCCESS: '/payment/success',
    CANCEL: '/payment/cancel',
    FAIL: '/payment/fail',
  },
} as const;