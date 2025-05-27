/**
 * 암호화 유틸리티 (간소화 버전)
 * 브라우저와 서버 환경 모두 지원
 */

import { EncryptionConfig } from '@/types/tempStorage';
import crypto from 'crypto';

// 암호화 설정
const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  version: 'v1'
};

/**
 * 환경변수에서 암호화 키 가져오기
 * 개발 환경에서는 자동으로 키 생성
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  
  if (!key) {
    // 개발 환경에서는 임시 키 생성
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Encryption] 개발 환경: 임시 암호화 키를 생성합니다.');
      // 고정된 개발용 키 (실제 운영에서는 사용하지 말 것)
      return 'dev-temp-key-32-chars-long-for-development-only';
    }
    
    throw new Error('ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  }
  
  return key;
}

/**
 * 서버 환경에서만 실제 암호화 수행
 * 클라이언트에서는 Base64 인코딩으로 대체 (보안상 제한적)
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    if (typeof window === 'undefined') {
      // 서버 환경 - 실제 AES-256-GCM 암호화
      const keyString = getEncryptionKey();
      const key = Buffer.from(keyString.padEnd(32, '0').slice(0, 32)); // 32바이트로 맞춤
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // IV + 암호화된 데이터를 결합
      const result = iv.toString('hex') + ':' + encrypted;
      return Buffer.from(result).toString('base64');
    } else {
      // 클라이언트 환경 - Base64 인코딩 (임시 방편)
      console.warn('[Encryption] 클라이언트에서는 Base64 인코딩만 지원됩니다.');
      return Buffer.from(plaintext).toString('base64');
    }
  } catch (error) {
    console.error('[Encryption] 암호화 실패:', error);
    throw new Error('데이터 암호화에 실패했습니다.');
  }
}

/**
 * 서버 환경에서만 실제 복호화 수행
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (typeof window === 'undefined') {
      // 서버 환경 - 실제 복호화
      const keyString = getEncryptionKey();
      const key = Buffer.from(keyString.padEnd(32, '0').slice(0, 32)); // 32바이트로 맞춤
      const decoded = Buffer.from(encryptedData, 'base64').toString();
      
      const [ivHex, encrypted] = decoded.split(':');
      
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } else {
      // 클라이언트 환경 - Base64 디코딩
      console.warn('[Encryption] 클라이언트에서는 Base64 디코딩만 지원됩니다.');
      return Buffer.from(encryptedData, 'base64').toString();
    }
  } catch (error) {
    console.error('[Encryption] 복호화 실패:', error);
    throw new Error('데이터 복호화에 실패했습니다.');
  }
}

/**
 * 데이터 해시 생성
 */
export async function generateDataHash(data: string): Promise<string> {
  try {
    if (typeof window === 'undefined') {
      // 서버 환경
      return crypto.createHash('sha256').update(data).digest('hex');
    } else {
      // 클라이언트 환경
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (error) {
    console.error('[Encryption] 해시 생성 실패:', error);
    throw new Error('데이터 해시 생성에 실패했습니다.');
  }
}

/**
 * 데이터 해시 검증
 */
export async function verifyDataHash(data: string, expectedHash: string): Promise<boolean> {
  try {
    const actualHash = await generateDataHash(data);
    return actualHash === expectedHash;
  } catch (error) {
    console.error('[Encryption] 해시 검증 실패:', error);
    return false;
  }
}

/**
 * 랜덤 세션 ID 생성
 */
export function generateSessionId(): string {
  if (typeof window === 'undefined') {
    // 서버 환경
    return crypto.randomUUID();
  } else {
    // 클라이언트 환경
    return window.crypto.randomUUID();
  }
}

/**
 * 암호화 키 생성 헬퍼
 */
export function generateEncryptionKey(): string {
  if (typeof window === 'undefined') {
    return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength).toString('base64');
  } else {
    const key = new Uint8Array(ENCRYPTION_CONFIG.keyLength);
    window.crypto.getRandomValues(key);
    return Buffer.from(key).toString('base64');
  }
}

/**
 * 암호화 설정 검증
 */
export function validateEncryptionSetup(): boolean {
  try {
    if (typeof window === 'undefined') {
      // 서버 환경에서만 검증
      const key = getEncryptionKey();
      console.log('[Encryption] 암호화 설정이 올바르게 구성되었습니다.');
      return true;
    } else {
      // 클라이언트 환경에서는 기본 검증만
      console.log('[Encryption] 클라이언트 환경 - 기본 암호화 기능 사용 가능');
      return true;
    }
  } catch (error) {
    console.error('[Encryption] 암호화 설정 검증 실패:', error);
    return false;
  }
} 