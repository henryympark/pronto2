'use client';

import { useToast } from '@/hooks/use-toast';

export function useAdminToast() {
  const { toast } = useToast();

  const showSuccess = (message: string, description?: string) => {
    toast({
      title: '성공',
      description: message,
      variant: 'default'
    });
  };

  const showError = (message: string, description?: string) => {
    toast({
      title: '오류',
      description: message,
      variant: 'destructive'
    });
  };

  const showInfo = (message: string, description?: string) => {
    toast({
      title: '알림',
      description: message,
      variant: 'default'
    });
  };

  const showWarning = (message: string, description?: string) => {
    toast({
      title: '주의',
      description: message,
      variant: 'default'
    });
  };

  // 일반적인 관리자 액션에 대한 미리 정의된 메시지들
  const adminActions = {
    created: (itemName: string) => showSuccess(`${itemName}이(가) 성공적으로 생성되었습니다.`),
    updated: (itemName: string) => showSuccess(`${itemName}이(가) 성공적으로 수정되었습니다.`),
    deleted: (itemName: string) => showSuccess(`${itemName}이(가) 성공적으로 삭제되었습니다.`),
    activated: (itemName: string) => showSuccess(`${itemName}이(가) 활성화되었습니다.`),
    deactivated: (itemName: string) => showSuccess(`${itemName}이(가) 비활성화되었습니다.`),
    approved: (itemName: string) => showSuccess(`${itemName}이(가) 승인되었습니다.`),
    rejected: (itemName: string) => showSuccess(`${itemName}이(가) 거부되었습니다.`),
    
    // 에러 메시지들
    createFailed: (itemName: string) => showError(`${itemName} 생성에 실패했습니다.`),
    updateFailed: (itemName: string) => showError(`${itemName} 수정에 실패했습니다.`),
    deleteFailed: (itemName: string) => showError(`${itemName} 삭제에 실패했습니다.`),
    loadFailed: (itemName: string) => showError(`${itemName} 로드에 실패했습니다.`),
    
    // 권한 관련
    unauthorized: () => showError('권한이 없습니다.'),
    forbidden: () => showError('접근이 금지되었습니다.'),
    
    // 네트워크 관련
    networkError: () => showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.'),
    serverError: () => showError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    adminActions,
    
    // 원래 toast 함수도 노출 (커스터마이징이 필요한 경우)
    toast
  };
} 