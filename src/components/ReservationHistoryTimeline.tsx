"use client";

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle, Edit, Calendar, User } from 'lucide-react';
import { ReservationHistory } from '@/types/reservation';
import { cn } from '@/lib/utils';

interface ReservationHistoryTimelineProps {
  history: ReservationHistory[];
  loading?: boolean;
  error?: string | null;
}

export default function ReservationHistoryTimeline({ 
  history, 
  loading = false, 
  error = null 
}: ReservationHistoryTimelineProps) {
  // 액션 타입에 따른 아이콘과 색상 결정
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Calendar className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'modified':
        return <Edit className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'confirmed':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'modified':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'completed':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getActionText = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return '예약 생성';
      case 'confirmed':
        return '예약 확정';
      case 'modified':
        return '예약 변경';
      case 'cancelled':
        return '예약 취소';
      case 'completed':
        return '이용 완료';
      default:
        return actionType;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch (e) {
      return '날짜 형식 오류';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold mb-3">진행이력</h4>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold mb-3">진행이력</h4>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold mb-3">진행이력</h4>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">진행이력이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold mb-3">진행이력</h4>
      <div className="space-y-4">
        {history.map((item, index) => (
          <div key={item.id} className="flex items-start space-x-3">
            {/* 타임라인 아이콘 */}
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              getActionColor(item.action_type)
            )}>
              {getActionIcon(item.action_type)}
            </div>
            
            {/* 타임라인 연결선 */}
            {index < history.length - 1 && (
              <div className="absolute left-[15px] mt-8 w-0.5 h-6 bg-gray-200"></div>
            )}
            
            {/* 이력 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getActionText(item.action_type)}
                  </span>
                  {item.performed_by_type === 'admin' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <User className="h-3 w-3 mr-1" />
                      관리자
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(item.created_at)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mt-1">
                {item.action_description}
              </p>
              
              {/* 변경 상세 정보 (변경 시에만 표시) */}
              {item.action_type === 'modified' && item.old_data && item.new_data && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="space-y-1">
                    {/* 날짜 변경 */}
                    {item.old_data.reservation_date !== item.new_data.reservation_date && (
                      <div>
                        <span className="text-gray-500">날짜:</span>{' '}
                        <span className="line-through text-red-500">
                          {format(new Date(item.old_data.reservation_date), 'yyyy-MM-dd', { locale: ko })}
                        </span>{' '}
                        → <span className="text-green-600">
                          {format(new Date(item.new_data.reservation_date), 'yyyy-MM-dd', { locale: ko })}
                        </span>
                      </div>
                    )}
                    
                    {/* 시간 변경 */}
                    {(item.old_data.start_time !== item.new_data.start_time || 
                      item.old_data.end_time !== item.new_data.end_time) && (
                      <div>
                        <span className="text-gray-500">시간:</span>{' '}
                        <span className="line-through text-red-500">
                          {item.old_data.start_time?.substring(0, 5)} ~ {item.old_data.end_time?.substring(0, 5)}
                        </span>{' '}
                        → <span className="text-green-600">
                          {item.new_data.start_time?.substring(0, 5)} ~ {item.new_data.end_time?.substring(0, 5)}
                        </span>
                      </div>
                    )}
                    
                    {/* 가격 변경 */}
                    {item.old_data.total_price !== item.new_data.total_price && (
                      <div>
                        <span className="text-gray-500">가격:</span>{' '}
                        <span className="line-through text-red-500">
                          {item.old_data.total_price?.toLocaleString()}원
                        </span>{' '}
                        → <span className="text-green-600">
                          {item.new_data.total_price?.toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 