/**
 * 이미지 관련 상수 정의
 */

/**
 * 기본 이미지 URL (서비스에 이미지가 없을 때 사용)
 */
export const DEFAULT_IMAGES = {
  // 서비스 대표 이미지
  SERVICE_DEFAULT: "https://picsum.photos/seed/pronto_default/1200/600",
  
  // 서비스 갤러리 이미지
  SERVICE_GALLERY: [
    "https://picsum.photos/seed/pronto_gallery1/800/600",
    "https://picsum.photos/seed/pronto_gallery2/800/600",
    "https://picsum.photos/seed/pronto_gallery3/800/600"
  ],
  
  // 사용자 프로필 이미지
  USER_PROFILE: "https://picsum.photos/seed/pronto_user/200/200",
  
  // 로고 이미지
  LOGO: "/logo.png",
  
  // 기타 이미지
  PLACEHOLDER: "https://picsum.photos/seed/pronto_placeholder/400/300"
}; 