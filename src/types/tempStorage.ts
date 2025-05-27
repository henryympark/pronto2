/**
 * 임시 저장 시스템 타입 정의
 * 로그인 전 예약 정보 임시 저장을 위한 데이터 구조
 */

/**
 * 데이터 보안 레벨
 */
export type SecurityLevel = 'public' | 'sensitive' | 'highly_sensitive';

/**
 * 비개인정보 데이터 (sessionStorage 저장)
 * Level 1 (공개): 개인정보가 아닌 일반적인 예약 정보
 */
export interface PublicReservationData {
  serviceId: string;                    // 서비스 ID
  selectedDate: string | null;          // 선택된 날짜 (YYYY-MM-DD)
  selectedTimeRange: {
    start: string;                      // 시작 시간 (HH:MM)
    end: string;                        // 종료 시간 (HH:MM)
    duration: number;                   // 지속 시간 (분)
    price: number;                      // 가격
  };
  timestamp: number;                    // 저장 시점 타임스탬프
}

/**
 * 개인정보 데이터 (서버 암호화 저장)
 * Level 2 & 3: 암호화가 필요한 민감한 개인정보
 */
export interface PrivateReservationData {
  // Level 2 (민감)
  customerName: string;                 // 고객명
  companyName: string;                  // 회사명
  
  // Level 3 (고민감)
  shootingPurpose: string;              // 촬영 목적
  vehicleNumber: string;                // 차량번호
  
  // 메타데이터
  privacyAgreed: boolean;               // 개인정보 동의 여부
}

/**
 * 암호화된 개인정보 데이터
 */
export interface EncryptedPrivateData {
  customerName: string;                 // AES-256-GCM 암호화
  companyName: string;                  // AES-256-GCM 암호화
  shootingPurpose: string;              // AES-256-GCM 암호화
  vehicleNumber: string;                // AES-256-GCM 암호화
  privacyAgreed: boolean;               // 평문 (민감하지 않음)
  encryptionVersion: string;            // 암호화 버전 (v1)
}

/**
 * 서버 임시 저장 테이블 스키마
 */
export interface TempReservationStorage {
  id: string;                           // UUID 기본키
  session_id: string;                   // 클라이언트 세션 연결 키 (UUID)
  encrypted_data: string;               // JSON 직렬화 후 암호화된 개인정보
  data_hash: string;                    // 데이터 무결성 검증용 해시
  created_at: string;                   // 생성 시간 (ISO 8601)
  expires_at: string;                   // 만료 시간 (30분 후)
  user_agent?: string;                  // 사용자 에이전트 (선택적 보안 검증)
  ip_address?: string;                  // IP 주소 (선택적 보안 검증)
}

/**
 * 클라이언트 sessionStorage 스키마
 */
export interface ClientTempStorage {
  sessionId: string;                    // 서버 데이터 연결 키
  publicData: PublicReservationData;    // 비개인정보
  hasPrivateData: boolean;              // 서버에 개인정보 저장 여부
  version: string;                      // 스키마 버전 (v1)
}

/**
 * 임시 저장 요청 데이터
 */
export interface TempStorageRequest {
  publicData: PublicReservationData;
  privateData: PrivateReservationData;
  returnUrl: string;                    // 로그인 후 리디렉션 URL
}

/**
 * 임시 저장 응답 데이터
 */
export interface TempStorageResponse {
  sessionId: string;                    // 클라이언트 연결 키
  expiresAt: string;                    // 만료 시간
  loginUrl: string;                     // 로그인 페이지 URL (returnUrl 포함)
}

/**
 * 데이터 복원 요청
 */
export interface RestoreDataRequest {
  sessionId: string;                    // 클라이언트 연결 키
}

/**
 * 데이터 복원 응답
 */
export interface RestoreDataResponse {
  publicData: PublicReservationData;
  privateData: PrivateReservationData;
  isExpired: boolean;                   // 만료 여부
}

/**
 * 암호화 설정
 */
export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyLength: 32;                        // 256비트
  ivLength: 16;                         // 128비트
  tagLength: 16;                        // 128비트
  version: 'v1';
}

/**
 * 데이터 분류 매핑
 */
export const DATA_CLASSIFICATION: Record<keyof PrivateReservationData, SecurityLevel> = {
  customerName: 'sensitive',            // Level 2
  companyName: 'sensitive',             // Level 2
  shootingPurpose: 'highly_sensitive',  // Level 3
  vehicleNumber: 'highly_sensitive',    // Level 3
  privacyAgreed: 'public',              // Level 1 (메타데이터)
};

/**
 * 임시 저장 설정
 */
export const TEMP_STORAGE_CONFIG = {
  TTL_MINUTES: 30,                      // 30분 만료
  MAX_STORAGE_SIZE: 1024 * 50,          // 50KB 최대 크기
  CLEANUP_BATCH_SIZE: 100,              // 배치 정리 크기
  SESSION_KEY_PREFIX: 'pronto_temp_',   // sessionStorage 키 접두사
  TABLE_NAME: 'temp_reservation_storage', // Supabase 테이블명
} as const;

/**
 * 오류 타입
 */
export interface TempStorageError {
  code: 'ENCRYPTION_FAILED' | 'STORAGE_FULL' | 'EXPIRED' | 'NOT_FOUND' | 'INVALID_DATA';
  message: string;
  details?: any;
} 