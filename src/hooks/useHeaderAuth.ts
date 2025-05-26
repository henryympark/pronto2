import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';

/**
 * useHeaderAuth hook
 * 헤더에서 사용할 인증 관련 상태와 함수들을 제공
 */

export interface UseHeaderAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

export const useHeaderAuth = (): UseHeaderAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 여기서는 실제 Supabase 인증 로직을 구현해야 하지만
    // 현재는 기본 구조만 제공
    const checkAuth = async () => {
      try {
        // TODO: Supabase auth 체크 로직 구현
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async (): Promise<void> => {
    try {
      // TODO: Supabase logout 로직 구현
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout
  };
};

export default useHeaderAuth;
