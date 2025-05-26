import { useEffect, useState } from 'react';

/**
 * useIsMounted hook
 * 컴포넌트가 마운트되었는지 확인하는 hook
 * 하이드레이션 불일치 문제를 해결하기 위해 사용
 */
export const useIsMounted = (): boolean => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};

export default useIsMounted;
