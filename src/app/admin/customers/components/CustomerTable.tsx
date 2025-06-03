"use client";

import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Edit, Eye } from 'lucide-react';
import { HighlightText } from '../../reservations/utils/searchHighlight';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatTimeDisplay } from '@/lib/date-utils';

interface CustomerTableProps {
  customers: Customer[];
  searchQuery: string;
  onViewCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
}

export default function CustomerTable({
  customers,
  searchQuery,
  onViewCustomer,
  onEditCustomer,
  onAddCustomer,
}: CustomerTableProps) {

  const getAuthProviderText = (provider: string) => {
    switch (provider) {
      case 'email':
        return '이메일';
      case 'google':
        return '구글';
      case 'kakao':
        return '카카오';
      default:
        return provider || '이메일';
    }
  };

  const formatTimeDisplayLocal = (minutes: number) => {
    if (!minutes || minutes === 0) return '0분';
    return formatTimeDisplay(minutes);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">고객 목록</h2>
          <p className="text-sm text-gray-500">총 {customers.length}명</p>
        </div>
        <Button
          onClick={onAddCustomer}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          고객 추가
        </Button>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객 정보
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  활동
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  적립시간
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        <HighlightText 
                          text={customer.nickname || customer.email || '이름 없음'} 
                          searchQuery={searchQuery} 
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        <HighlightText 
                          text={customer.email || ''} 
                          searchQuery={searchQuery} 
                        />
                      </div>
                      {customer.company_name && (
                        <div className="text-sm text-blue-600">
                          <HighlightText 
                            text={customer.company_name} 
                            searchQuery={searchQuery} 
                          />
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {getAuthProviderText(customer.auth_provider)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="text-sm text-gray-900">
                          <HighlightText 
                            text={customer.phone} 
                            searchQuery={searchQuery} 
                          />
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {format(new Date(customer.created_at), 'yyyy.MM.dd', { locale: ko })} 가입
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.total_visit_count || 0}회 방문
                      </div>
                      {customer.last_visit_date && (
                        <div className="text-xs text-gray-500">
                          최근: {format(new Date(customer.last_visit_date), 'MM.dd', { locale: ko })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-blue-600">
                      {formatTimeDisplayLocal(customer.accumulated_time_minutes)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant={customer.is_active ? "default" : "destructive"}>
                        {customer.is_active ? '활성' : '비활성'}
                      </Badge>
                      {customer.is_vip && (
                        <Badge variant="secondary" className="text-xs">
                          VIP
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCustomer(customer)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditCustomer(customer)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        수정
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">조건에 맞는 고객이 없습니다.</div>
        </div>
      )}
    </div>
  );
} 