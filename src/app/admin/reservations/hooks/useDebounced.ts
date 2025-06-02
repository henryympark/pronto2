import { useState, useEffect, useRef } from 'react';

/**
 * Debounced 값을 관리하는 커스텀 훅
 * @param value - debounce를 적용할 값
 * @param delay - 지연 시간 (ms)
 * @returns debouncedValue
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 이전 타이머 정리
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새로운 타이머 설정
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 클린업 함수
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

/**
 * 검색어와 검색 히스토리를 관리하는 커스텀 훅
 */
export function useSearchWithHistory(
  onSearch: (query: string) => void,
  debounceDelay: number = 300,
  maxHistorySize: number = 10
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const debouncedSearchQuery = useDebounced(searchQuery, debounceDelay);

  // 로컬 스토리지에서 검색 히스토리 로드
  useEffect(() => {
    const savedHistory = localStorage.getItem('reservation-search-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory);
        }
      } catch (error) {
        console.warn('검색 히스토리 로드 실패:', error);
      }
    }
  }, []);

  // debounced 검색어가 변경될 때 검색 실행
  useEffect(() => {
    onSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, onSearch]);

  // 검색어 업데이트
  const updateSearchQuery = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  // 검색어를 히스토리에 추가
  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const trimmedQuery = query.trim();
    const newHistory = [
      trimmedQuery,
      ...searchHistory.filter(item => item !== trimmedQuery)
    ].slice(0, maxHistorySize);

    setSearchHistory(newHistory);
    
    // 로컬 스토리지에 저장
    try {
      localStorage.setItem('reservation-search-history', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('검색 히스토리 저장 실패:', error);
    }
  };

  // 검색 실행 (Enter 키 또는 검색 버튼 클릭 시)
  const executeSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      addToHistory(trimmedQuery);
      onSearch(trimmedQuery);
    }
    setShowHistory(false);
  };

  // 히스토리에서 검색어 선택
  const selectFromHistory = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    setShowHistory(false);
  };

  // 검색어 초기화
  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
    setShowHistory(false);
  };

  // 히스토리 초기화
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('reservation-search-history');
  };

  return {
    searchQuery,
    searchHistory,
    showHistory,
    updateSearchQuery,
    executeSearch,
    selectFromHistory,
    clearSearch,
    clearHistory,
    setShowHistory,
  };
} 