import { useEffect, useState } from 'react';

/**
 * useIsMounted hook
 * 컴포넌트가 마운트되었는지 확인하는 훅
 * SSR 환경에서 클라이언트 사이드에서만 실행되어야 하는 코드를 위해 사용
 */
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
