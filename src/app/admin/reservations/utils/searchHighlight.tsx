import React from 'react';

/**
 * 문자열에서 검색어와 일치하는 부분을 하이라이트하는 컴포넌트
 */
interface HighlightTextProps {
  text: string;
  searchQuery: string;
  className?: string;
  highlightClassName?: string;
}

export function HighlightText({ 
  text, 
  searchQuery, 
  className = '',
  highlightClassName = 'bg-yellow-200 font-medium' 
}: HighlightTextProps) {
  if (!searchQuery.trim()) {
    return <span className={className}>{text}</span>;
  }

  // 대소문자 구분하지 않는 검색
  const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isHighlight = regex.test(part);
        return isHighlight ? (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}

/**
 * 정규식에서 특수 문자를 이스케이프하는 함수
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 검색어가 텍스트에 포함되어 있는지 확인하는 함수
 */
export function containsSearchQuery(text: string, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true;
  return text.toLowerCase().includes(searchQuery.toLowerCase());
}

/**
 * 여러 필드에서 검색어를 찾는 함수
 */
export function searchInMultipleFields(
  fields: (string | null | undefined)[],
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true;
  
  const query = searchQuery.toLowerCase();
  
  return fields.some(field => {
    if (!field) return false;
    return field.toLowerCase().includes(query);
  });
}

/**
 * 검색어 일치 점수를 계산하는 함수 (관련성 순으로 정렬할 때 사용)
 */
export function calculateMatchScore(
  text: string,
  searchQuery: string
): number {
  if (!searchQuery.trim()) return 0;
  
  const query = searchQuery.toLowerCase();
  const content = text.toLowerCase();
  
  // 완전 일치
  if (content === query) return 100;
  
  // 시작 부분 일치
  if (content.startsWith(query)) return 80;
  
  // 끝 부분 일치
  if (content.endsWith(query)) return 60;
  
  // 포함
  if (content.includes(query)) return 40;
  
  // 단어 경계 일치
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(query)}\\b`, 'i');
  if (wordBoundaryRegex.test(content)) return 70;
  
  return 0;
}

/**
 * 검색 결과를 관련성 순으로 정렬하는 함수
 */
export function sortByRelevance<T>(
  items: T[],
  searchQuery: string,
  getSearchFields: (item: T) => string[]
): T[] {
  if (!searchQuery.trim()) return items;

  return items
    .map(item => ({
      item,
      score: Math.max(
        ...getSearchFields(item).map(field => 
          calculateMatchScore(field, searchQuery)
        )
      )
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
