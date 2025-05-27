/**
 * 클라이언트 임시 저장 관리자
 * sessionStorage와 서버 API를 통한 예약 정보 임시 저장/복원
 */

import { 
  ClientTempStorage, 
  PublicReservationData, 
  PrivateReservationData,
  TempStorageRequest,
  TempStorageResponse,
  RestoreDataRequest,
  TEMP_STORAGE_CONFIG
} from '@/types/tempStorage';

/**
 * 임시 저장 관리자 클래스
 */
export class TempStorageManager {
  private storageKey: string;

  constructor() {
    this.storageKey = `${TEMP_STORAGE_CONFIG.SESSION_KEY_PREFIX}reservation`;
  }

  /**
   * 예약 정보 임시 저장
   */
  async saveReservationData(
    publicData: PublicReservationData,
    privateData: PrivateReservationData,
    returnUrl: string
  ): Promise<TempStorageResponse> {
    try {
      console.log('[TempStorageManager] 임시 저장 시작');

      // 서버에 개인정보 암호화 저장 요청
      const request: TempStorageRequest = {
        publicData,
        privateData,
        returnUrl
      };

      const response = await fetch('/api/temp-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`서버 저장 실패: ${errorData.message}`);
      }

      const result: TempStorageResponse = await response.json();

      // 클라이언트 sessionStorage에 비개인정보 저장
      const clientData: ClientTempStorage = {
        sessionId: result.sessionId,
        publicData,
        hasPrivateData: true,
        version: 'v1'
      };

      this.saveToSessionStorage(clientData);

      console.log('[TempStorageManager] 임시 저장 완료:', result.sessionId);
      return result;

    } catch (error) {
      console.error('[TempStorageManager] 임시 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 임시 저장된 데이터 복원
   */
  async restoreReservationData(): Promise<{
    publicData: PublicReservationData;
    privateData: PrivateReservationData;
  } | null> {
    try {
      console.log('[TempStorageManager] 데이터 복원 시작');

      // sessionStorage에서 클라이언트 데이터 가져오기
      const clientData = this.getFromSessionStorage();
      if (!clientData || !clientData.hasPrivateData) {
        console.log('[TempStorageManager] 복원할 데이터 없음');
        return null;
      }

      // 서버에서 개인정보 복원
      const request: RestoreDataRequest = {
        sessionId: clientData.sessionId
      };

      const response = await fetch('/api/temp-storage/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'EXPIRED' || errorData.error === 'NOT_FOUND') {
          // 만료되거나 존재하지 않는 데이터는 클라이언트에서도 정리
          this.clearTempData();
          console.log('[TempStorageManager] 만료된 데이터 정리됨');
          return null;
        }
        throw new Error(`서버 복원 실패: ${errorData.message}`);
      }

      const result = await response.json();

      console.log('[TempStorageManager] 데이터 복원 완료');

      return {
        publicData: clientData.publicData,
        privateData: result.privateData
      };

    } catch (error) {
      console.error('[TempStorageManager] 데이터 복원 실패:', error);
      // 오류 발생 시 클라이언트 데이터도 정리
      this.clearTempData();
      throw error;
    }
  }

  /**
   * 임시 저장 데이터 상태 확인
   */
  async checkTempDataStatus(): Promise<{
    exists: boolean;
    isExpired: boolean;
    expiresAt?: string;
  }> {
    try {
      const clientData = this.getFromSessionStorage();
      if (!clientData) {
        return { exists: false, isExpired: true };
      }

      // 서버에서 상태 확인
      const response = await fetch(
        `/api/temp-storage/restore?sessionId=${clientData.sessionId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        return { exists: false, isExpired: true };
      }

      return await response.json();

    } catch (error) {
      console.error('[TempStorageManager] 상태 확인 실패:', error);
      return { exists: false, isExpired: true };
    }
  }

  /**
   * 임시 저장 데이터 삭제 (로그인 완료 후)
   */
  async clearTempData(): Promise<void> {
    try {
      const clientData = this.getFromSessionStorage();
      if (clientData) {
        // 서버에서 암호화된 데이터 삭제
        await fetch(`/api/temp-storage?sessionId=${clientData.sessionId}`, {
          method: 'DELETE',
        });
      }
    } catch (error) {
      console.error('[TempStorageManager] 서버 데이터 삭제 실패:', error);
      // 서버 삭제 실패해도 클라이언트 데이터는 정리
    } finally {
      // 클라이언트 sessionStorage 정리
      this.removeFromSessionStorage();
      console.log('[TempStorageManager] 임시 데이터 정리 완료');
    }
  }

  /**
   * 현재 저장된 공개 데이터만 가져오기
   */
  getPublicData(): PublicReservationData | null {
    const clientData = this.getFromSessionStorage();
    return clientData?.publicData || null;
  }

  /**
   * 임시 저장 데이터 존재 여부 확인
   */
  hasTempData(): boolean {
    return this.getFromSessionStorage() !== null;
  }

  /**
   * sessionStorage에 클라이언트 데이터 저장
   */
  private saveToSessionStorage(data: ClientTempStorage): void {
    try {
      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify(data);
        
        // 크기 제한 확인
        if (serialized.length > TEMP_STORAGE_CONFIG.MAX_STORAGE_SIZE) {
          throw new Error('저장할 데이터가 크기 제한을 초과했습니다.');
        }

        sessionStorage.setItem(this.storageKey, serialized);
      }
    } catch (error) {
      console.error('[TempStorageManager] sessionStorage 저장 실패:', error);
      throw error;
    }
  }

  /**
   * sessionStorage에서 클라이언트 데이터 가져오기
   */
  private getFromSessionStorage(): ClientTempStorage | null {
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(this.storageKey);
        if (stored) {
          const data: ClientTempStorage = JSON.parse(stored);
          
          // 버전 호환성 확인
          if (data.version === 'v1') {
            return data;
          } else {
            console.warn('[TempStorageManager] 호환되지 않는 버전:', data.version);
            this.removeFromSessionStorage();
          }
        }
      }
      return null;
    } catch (error) {
      console.error('[TempStorageManager] sessionStorage 읽기 실패:', error);
      // 손상된 데이터 정리
      this.removeFromSessionStorage();
      return null;
    }
  }

  /**
   * sessionStorage에서 클라이언트 데이터 제거
   */
  private removeFromSessionStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('[TempStorageManager] sessionStorage 제거 실패:', error);
    }
  }
}

/**
 * 전역 임시 저장 관리자 인스턴스
 */
export const tempStorageManager = new TempStorageManager();

/**
 * 임시 저장 유틸리티 함수들
 */
export const tempStorageUtils = {
  /**
   * 현재 예약 정보를 임시 저장하고 로그인 페이지로 리디렉션
   */
  async saveAndRedirectToLogin(
    publicData: PublicReservationData,
    privateData: PrivateReservationData,
    currentUrl: string = window.location.href
  ): Promise<void> {
    try {
      const result = await tempStorageManager.saveReservationData(
        publicData,
        privateData,
        currentUrl
      );

      // 로그인 페이지로 리디렉션
      window.location.href = result.loginUrl;
    } catch (error) {
      console.error('[TempStorageUtils] 저장 및 리디렉션 실패:', error);
      throw error;
    }
  },

  /**
   * 로그인 완료 후 데이터 복원 및 상태 복구
   */
  async restoreAfterLogin(): Promise<{
    publicData: PublicReservationData;
    privateData: PrivateReservationData;
  } | null> {
    try {
      const restored = await tempStorageManager.restoreReservationData();
      if (restored) {
        // 복원 완료 후 임시 데이터 정리
        await tempStorageManager.clearTempData();
      }
      return restored;
    } catch (error) {
      console.error('[TempStorageUtils] 로그인 후 복원 실패:', error);
      return null;
    }
  },

  /**
   * 페이지 로드 시 임시 데이터 상태 확인
   */
  async checkAndCleanupExpiredData(): Promise<boolean> {
    try {
      if (!tempStorageManager.hasTempData()) {
        return false;
      }

      const status = await tempStorageManager.checkTempDataStatus();
      if (status.isExpired || !status.exists) {
        await tempStorageManager.clearTempData();
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TempStorageUtils] 만료 데이터 정리 실패:', error);
      // 오류 발생 시 안전하게 정리
      await tempStorageManager.clearTempData();
      return false;
    }
  }
}; 