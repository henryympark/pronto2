"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Search, Filter, X, RotateCcw, Clock, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useSearchWithHistory } from '../hooks/useDebounced';
import { 
  FilterState, 
  DateRangeFilter, 
  StatusFilter,
  DATE_RANGE_OPTIONS, 
  STATUS_OPTIONS 
} from '../types/filterTypes';

interface ReservationFiltersProps {
  filters: FilterState;
  onUpdateDateRange: (dateRange: DateRangeFilter) => void;
  onUpdateCustomDateRange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  onUpdateStatus: (status: string) => void;
  onUpdateServiceId: (serviceId: string | undefined) => void;
  onUpdateSearchQuery: (query: string) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  isSearching?: boolean; // 검색 중인지 여부 추가
}

interface Service {
  id: string;
  name: string;
}

export default function ReservationFilters({
  filters,
  onUpdateDateRange,
  onUpdateCustomDateRange,
  onUpdateStatus,
  onUpdateServiceId,
  onUpdateSearchQuery,
  onResetFilters,
  totalCount,
  filteredCount,
  isSearching = false,
}: ReservationFiltersProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(filters.startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(filters.endDate);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supabase = useSupabase();

  // 검색 히스토리 기능
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

  // 서비스 목록 로드
  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('🔍 서비스 목록 로드 시작...');
        
        const { data, error } = await supabase
          .from('services')
          .select('id, name')
          .order('name');
          
        console.log('📊 서비스 쿼리 결과:', { data, error });
          
        if (error) {
          console.error('❌ Supabase 에러 상세:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('✅ 서비스 목록 로드 성공:', data?.length || 0, '개');
        setServices(data || []);
      } catch (error) {
        console.error('💥 서비스 목록 로드 오류:', {
          error,
          errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
          errorType: typeof error,
          errorKeys: error ? Object.keys(error) : []
        });
        
        // 에러가 발생해도 빈 배열로 설정하여 UI가 깨지지 않도록 함
        setServices([]);
      }
    };

    fetchServices();
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

  // 날짜 범위 선택 핸들러
  const handleDateRangeChange = (value: string) => {
    const dateRange = value as DateRangeFilter;
    if (dateRange === 'custom') {
      setCustomDateModalOpen(true);
    } else {
      onUpdateDateRange(dateRange);
    }
  };

  // 커스텀 날짜 범위 적용
  const handleCustomDateApply = () => {
    onUpdateCustomDateRange(tempStartDate, tempEndDate);
    setCustomDateModalOpen(false);
  };

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
      // 첫 번째 히스토리 항목으로 포커스 이동 (구현 시 추가)
    }
  };

  // 활성 필터 개수 계산
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.serviceId) count++;
    if (filters.searchQuery.trim()) count++;
    return count;
  }, [filters]);

  // 필터 상태 텍스트
  const getDateRangeText = () => {
    if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
      return `${format(filters.startDate, 'yyyy-MM-dd', { locale: ko })} ~ ${format(filters.endDate, 'yyyy-MM-dd', { locale: ko })}`;
    }
    return DATE_RANGE_OPTIONS.find(option => option.value === filters.dateRange)?.label || '전체';
  };

  const getStatusText = () => {
    return STATUS_OPTIONS.find(option => option.value === filters.status)?.label || '전체';
  };

  const getServiceText = () => {
    if (!filters.serviceId) return '전체';
    return services.find(service => service.id === filters.serviceId)?.name || '선택된 서비스';
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* 검색창과 기본 버튼들 */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
          {/* 검색창 (히스토리 포함) */}
          <div className="relative flex-1 max-w-md" ref={searchInputRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="고객명, 연락처, 예약번호로 검색..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setShowHistory(searchQuery.length > 0 && searchHistory.length > 0)}
                className="pl-9 pr-20"
              />
              
              {/* 검색 상태 표시 */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                {isSearching && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
                
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearSearch();
                      setShowHistory(false);
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                
                {searchHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    <History className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* 검색 히스토리 드롭다운 */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">최근 검색어</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-5 px-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      전체 삭제
                    </Button>
                  </div>
                  
                  {searchHistory.map((historyItem, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        selectFromHistory(historyItem);
                        setShowHistory(false);
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded text-sm flex items-center space-x-2"
                    >
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="flex-1 truncate">{historyItem}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 필터 버튼과 초기화 버튼 */}
          <div className="flex items-center space-x-2">
            <Button 
              variant={activeFiltersCount > 0 ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>필터</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            
            {filters.isFiltered && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onResetFilters}
                className="flex items-center space-x-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span>초기화</span>
              </Button>
            )}
          </div>
        </div>

        {/* 필터 옵션들 */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 날짜 범위 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">날짜 범위</label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상태 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">상태</label>
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

          {/* 서비스 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">서비스</label>
            <Select 
              value={filters.serviceId || "all"} 
              onValueChange={(value) => onUpdateServiceId(value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {filters.isFiltered && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">활성 필터:</span>
            
            {filters.dateRange !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {getDateRangeText()}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onUpdateDateRange('all')}
                />
              </Badge>
            )}
            
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                상태: {getStatusText()}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onUpdateStatus('all')}
                />
              </Badge>
            )}
            
            {filters.serviceId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                서비스: {getServiceText()}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onUpdateServiceId(undefined)}
                />
              </Badge>
            )}
            
            {filters.searchQuery.trim() && (
              <Badge variant="secondary" className="flex items-center gap-1">
                검색: {filters.searchQuery}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => {
                    clearSearch();
                    onUpdateSearchQuery('');
                  }}
                />
              </Badge>
            )}
          </div>
        )}

        {/* 결과 개수 표시 */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            {filters.isFiltered ? (
              <>전체 {totalCount}개 중 {filteredCount}개 표시</>
            ) : (
              <>총 {totalCount}개</>
            )}
          </div>
          
          {isSearching && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">검색 중...</span>
            </div>
          )}
        </div>

        {/* 정렬 도움말 */}
        <div className="mt-2 text-xs text-gray-400">
          💡 팁: 컬럼 헤더를 클릭하여 정렬하고, Shift+클릭으로 다중 정렬할 수 있습니다.
        </div>

        {/* 커스텀 날짜 범위 선택 모달 */}
        <Dialog open={customDateModalOpen} onOpenChange={setCustomDateModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>기간 선택</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">시작일</label>
                <Calendar
                  mode="single"
                  selected={tempStartDate}
                  onSelect={setTempStartDate}
                  className="rounded-md"
                  locale={ko}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">종료일</label>
                <Calendar
                  mode="single"
                  selected={tempEndDate}
                  onSelect={setTempEndDate}
                  className="rounded-md"
                  locale={ko}
                  disabled={(date) => tempStartDate ? date < tempStartDate : false}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setCustomDateModalOpen(false)}>
                취소
              </Button>
              <Button 
                onClick={handleCustomDateApply}
                disabled={!tempStartDate || !tempEndDate}
              >
                적용
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 