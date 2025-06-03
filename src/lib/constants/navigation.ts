export const NAVIGATION_ROUTES = {
  LOGIN: '/auth/login',
  MY_PAGE: '/my',
  ADMIN: '/admin/reservations',
} as const;

export const NAVIGATION_LABELS = {
  LOGIN: '로그인',
  MY_PAGE: '마이페이지',
  LOADING: '로딩 중...',
} as const;

export type NavigationRoute = typeof NAVIGATION_ROUTES[keyof typeof NAVIGATION_ROUTES];
export type NavigationLabel = typeof NAVIGATION_LABELS[keyof typeof NAVIGATION_LABELS]; 