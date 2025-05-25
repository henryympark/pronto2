/**
 * 이미지 관련 상수들
 */
export const IMAGE_CONSTANTS = {
  PLACEHOLDER: {
    STUDIO: '/images/placeholder-studio.jpg',
    USER: '/images/placeholder-user.png',
    SERVICE: '/images/placeholder-service.jpg',
  },
  LOGOS: {
    MAIN: '/images/logo.png',
    WHITE: '/images/logo-white.png',
    FAVICON: '/favicon.ico',
  },
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  QUALITY: {
    THUMBNAIL: 60,
    MEDIUM: 80,
    HIGH: 90,
  },
} as const;