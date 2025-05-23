"use client";

import { useState, useEffect } from "react";

/**
 * 컴포넌트가 클라이언트 사이드에 마운트되었는지 확인하는 훅
 * 서버 사이드 렌더링과 클라이언트 사이드 렌더링의 차이를 처리하는 데 유용
 */
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return isMounted;
} 