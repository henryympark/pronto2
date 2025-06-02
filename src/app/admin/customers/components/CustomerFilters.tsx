"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, RotateCcw, Users, Loader2, History, Building2, Crown, UserCheck } from "lucide-react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useSearchWithHistory } from '../../reservations/hooks/useDebounced';
import { 
  FilterState, 
  ActivityFilter, 
  FrequencyFilter,
  CustomerTypeFilter,
  StatusFilter,
  ACTIVITY_OPTIONS, 
  FREQUENCY_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  STATUS_OPTIONS
} from '../types/filterTypes';

interface CustomerTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

interface CustomerFiltersProps {
  filters: FilterState;
  onUpdateActivity: (activity: ActivityFilter) => void;
  onUpdateFrequency: (frequency: FrequencyFilter) => void;
  onUpdateCustomerType: (customerType: CustomerTypeFilter) => void;
  onUpdateStatus: (status: StatusFilter) => void;
  onUpdateSelectedTagIds: (tagIds: string[]) => void;
  onUpdateSearchQuery: (query: string) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  isSearching?: boolean;
}

export default function CustomerFilters({
  filters,
  onUpdateActivity,
  onUpdateFrequency,
  onUpdateCustomerType,
  onUpdateStatus,
  onUpdateSelectedTagIds,
  onUpdateSearchQuery,
  onResetFilters,
  totalCount,
  filteredCount,
  isSearching = false,
}: CustomerFiltersProps) {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supabase = useSupabase();

  // 검색 히스토리 기능 (Phase 1에서 재사용)
  const {
    searchQuery,
    searchHistory,
    showHistory,
    updateSearchQuery,
    executeSearch,
    selectFromHistory,
    clearSearch,
    clearHistory,
    setShowHistory,
  } = useSearchWithHistory(onUpdateSearchQuery, 300, 10);

  // 검색어를 filters와 동기화
  useEffect(() => {
    if (searchQuery !== filters.searchQuery) {
      updateSearchQuery(filters.searchQuery);
    }
  }, [filters.searchQuery]);

  // 태그 목록 로드
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        console.log('🏷️ 고객 태그 목록 로드 시작...');
        
        const { data, error } = await supabase
          .from('customer_tags')
          .select('id, name, color, description')
          .order('name');
          
        console.log('📊 태그 쿼리 결과:', { data, error });
          
        if (error) {
          console.error('❌ 태그 로드 에러:', error);
          throw error;
        }
        
        console.log('✅ 태그 목록 로드 성공:', data?.length || 0, '개');
        setTags(data || []);
      } catch (error) {
        console.error('💥 태그 목록 로드 오류:', error);
        setTags([]);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchTags();
  }, [supabase]);

  // 검색창 외부 클릭 시 히스토리 숨기기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowHistory]);

  // 검색 입력 핸들러
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateSearchQuery(value);
    setShowHistory(value.length > 0 && searchHistory.length > 0);
  };

  // 검색 실행 (Enter 키)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch();
      setShowHistory(false);
    } else if (e.key === 'ArrowDown' && showHistory && searchHistory.length > 0) {
      e.preventDefault();
    }
  };

  // 태그 선택/해제 핸들러
  const handleTagToggle = (tagId: string) => {
    const currentTags = filters.selectedTagIds;
    const updatedTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    onUpdateSelectedTagIds(updatedTags);
  };

  // 활성 필터 개수 계산
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.activity !== 'all') count++;
    if (filters.frequency !== 'all') count++;
    if (filters.customerType !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.selectedTagIds.length > 0) count++;
    if (filters.searchQuery.trim()) count++;
    return count;
  }, [filters]);

  // 필터 상태 텍스트
  const getActivityText = () => {
    return ACTIVITY_OPTIONS.find(option => option.value === filters.activity)?.label || '전체';
  };

  const getFrequencyText = () => {
    return FREQUENCY_OPTIONS.find(option => option.value === filters.frequency)?.label || '전체';
  };

  const getCustomerTypeText = () => {
    return CUSTOMER_TYPE_OPTIONS.find(option => option.value === filters.customerType)?.label || '전체';
  };

  const getStatusText = () => {
    return STATUS_OPTIONS.find(option => option.value === filters.status)?.label || '전체';
  };

  const getTagsText = () => {
    if (filters.selectedTagIds.length === 0) return '전체';
    if (filters.selectedTagIds.length === 1) {
      const tag = tags.find(t => t.id === filters.selectedTagIds[0]);
      return tag?.name || '선택된 태그';
    }
    return `${filters.selectedTagIds.length}개 태그`;
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* 검색창과 기본 버튼들 */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
          {/* 통합 검색창 */}
          <div className="relative flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                ref={searchInputRef}
                placeholder="고객명, 이메일, 전화번호, 회사명, 메모 검색..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setShowHistory(searchQuery.length > 0 && searchHistory.length > 0)}
                className="pl-10 pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
              )}
              {searchQuery && !isSearching && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* 검색 히스토리 드롭다운 */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 border-b">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    최근 검색어
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-auto p-0 text-xs text-gray-400 hover:text-gray-600"
                  >
                    전체 삭제
                  </Button>
                </div>
                {searchHistory.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => selectFromHistory(term)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group"
                  >
                    <span>{term}</span>
                    <X className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 필터 버튼과 초기화 버튼 */}
          <div className="flex items-center space-x-2">
            <Button
              variant={filters.isFiltered ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-1" />
              필터 {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
            
            {filters.isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="whitespace-nowrap text-gray-600 hover:text-gray-900"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                초기화
              </Button>
            )}
          </div>
        </div>

        {/* 필터 옵션들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {/* 활성도 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <UserCheck className="w-4 h-4" />
              방문 활성도
            </label>
            <Select value={filters.activity} onValueChange={onUpdateActivity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 방문 빈도 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Users className="w-4 h-4" />
              방문 빈도
            </label>
            <Select value={filters.frequency} onValueChange={onUpdateFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 고객 유형 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Crown className="w-4 h-4" />
              고객 유형
            </label>
            <Select value={filters.customerType} onValueChange={onUpdateCustomerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상태 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              활성 상태
            </label>
            <Select value={filters.status} onValueChange={onUpdateStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 태그 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              태그
            </label>
            <Select value={getTagsText()} disabled={tagsLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" onClick={() => onUpdateSelectedTagIds([])}>
                  전체
                </SelectItem>
                {tags.map((tag) => (
                  <SelectItem
                    key={tag.id}
                    value={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    <div className="flex items-center gap-2">
                      {tag.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 선택된 태그 표시 */}
        {filters.selectedTagIds.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {filters.selectedTagIds.map((tagId) => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                
                return (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="flex items-center gap-2"
                    style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : {}}
                  >
                    {tag.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTagToggle(tagId)}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* 필터 결과 요약 */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              총 <strong className="text-gray-900">{totalCount}</strong>명의 고객 중{' '}
              <strong className="text-blue-600">{filteredCount}</strong>명 표시
            </span>
            {filters.isFiltered && (
              <span className="text-blue-600">
                필터 적용됨
              </span>
            )}
          </div>

          {/* 활성 필터 표시 */}
          {filters.isFiltered && (
            <div className="flex items-center space-x-2">
              {filters.activity !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  활성도: {getActivityText()}
                </Badge>
              )}
              {filters.frequency !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  빈도: {getFrequencyText()}
                </Badge>
              )}
              {filters.customerType !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  유형: {getCustomerTypeText()}
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  상태: {getStatusText()}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 