"use client";

import { useState } from 'react';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatTimeDisplay } from '@/lib/date-utils';

interface CustomerDetailModalProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  availableTags: Array<{ id: string; name: string; color?: string }>;
  customerTags: Array<{ customer_id: string; tag_id: string }>;
  onAddTag: (customerId: string, tagId: string) => Promise<boolean>;
  onRemoveTag: (customerId: string, tagId: string) => Promise<boolean>;
  onGrantRewards: (customerId: string, type: 'coupon' | 'time', minutes: number) => Promise<boolean>;
  grantLoading?: boolean;
}

export default function CustomerDetailModal({
  customer,
  open,
  onClose,
  availableTags,
  customerTags,
  onAddTag,
  onRemoveTag,
  onGrantRewards,
  grantLoading = false,
}: CustomerDetailModalProps) {
  const [grantType, setGrantType] = useState<'coupon' | 'time'>('coupon');
  const [couponMinutes, setCouponMinutes] = useState(30);
  const [timeMinutes, setTimeMinutes] = useState(10);

  if (!customer) return null;

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

  const handleGrantRewards = async () => {
    const minutes = grantType === 'coupon' ? couponMinutes : timeMinutes;
    await onGrantRewards(customer.id, grantType, minutes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>고객 상세 정보</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">기본 정보</TabsTrigger>
            <TabsTrigger value="activity">활동 현황</TabsTrigger>
            <TabsTrigger value="tags">태그 관리</TabsTrigger>
            <TabsTrigger value="rewards">리워드</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">고객 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">닉네임</Label>
                    <p className="text-sm mt-1">{customer.nickname || '설정되지 않음'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">이메일</Label>
                    <p className="text-sm mt-1">{customer.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">전화번호</Label>
                    <p className="text-sm mt-1">{customer.phone || '설정되지 않음'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">회사명</Label>
                    <p className="text-sm mt-1">{customer.company_name || '설정되지 않음'}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">가입 방식</Label>
                  <p className="text-sm mt-1">{getAuthProviderText(customer.auth_provider)}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">현재 적립 시간</Label>
                  <p className="text-sm mt-1 font-medium text-blue-600">
                    {formatTimeDisplayLocal(customer.accumulated_time_minutes)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">활동 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">총 방문 횟수</Label>
                    <p className="text-lg font-semibold text-green-600">
                      {customer.total_visit_count || 0}회
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">마지막 방문</Label>
                    <p className="text-sm mt-1">
                      {customer.last_visit_date 
                        ? format(new Date(customer.last_visit_date), 'yyyy년 MM월 dd일', { locale: ko })
                        : '방문 기록 없음'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">가입일</Label>
                    <p className="text-sm mt-1">
                      {format(new Date(customer.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">상태</Label>
                    <Badge variant={customer.is_active ? "default" : "destructive"}>
                      {customer.is_active ? '활성' : '비활성'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">태그 관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 현재 태그 표시 */}
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">현재 태그</Label>
                  <div className="flex flex-wrap gap-2">
                    {customerTags
                      .filter(tag => tag.customer_id === customer.id)
                      .map((tag) => (
                        <Badge 
                          key={tag.tag_id} 
                          variant="secondary" 
                          className="flex items-center gap-1"
                        >
                          {availableTags.find(t => t.id === tag.tag_id)?.name}
                          <button
                            onClick={() => onRemoveTag(customer.id, tag.tag_id)}
                            className="ml-1 text-gray-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    }
                    {customerTags.filter(tag => tag.customer_id === customer.id).length === 0 && (
                      <p className="text-sm text-gray-500">태그가 없습니다</p>
                    )}
                  </div>
                </div>

                {/* 태그 추가 */}
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">태그 추가</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags
                      .filter(tag => !customerTags.some(ct => ct.customer_id === customer.id && ct.tag_id === tag.id))
                      .map((tag) => (
                        <Button
                          key={tag.id}
                          variant="outline"
                          size="sm"
                          onClick={() => onAddTag(customer.id, tag.id)}
                          className="text-xs"
                        >
                          + {tag.name}
                        </Button>
                      ))
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">쿠폰/적립시간 부여</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 고객 정보 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {customer.nickname || customer.email || '이름 없음'}
                    </p>
                    <p className="text-sm text-gray-500">
                      현재 적립시간: {formatTimeDisplayLocal(customer.accumulated_time_minutes)}
                    </p>
                  </div>
                </div>

                {/* 부여 유형 선택 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">부여 유형</Label>
                  <Tabs value={grantType} onValueChange={(value) => setGrantType(value as 'coupon' | 'time')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="coupon">쿠폰</TabsTrigger>
                      <TabsTrigger value="time">적립시간</TabsTrigger>
                    </TabsList>

                    <div className="mt-4">
                      <TabsContent value="coupon" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="coupon-minutes">쿠폰 시간 (분)</Label>
                          <Select
                            value={couponMinutes.toString()}
                            onValueChange={(value) => setCouponMinutes(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30분</SelectItem>
                              <SelectItem value="60">60분</SelectItem>
                              <SelectItem value="90">90분</SelectItem>
                              <SelectItem value="120">120분</SelectItem>
                              <SelectItem value="180">180분</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>

                      <TabsContent value="time" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="time-minutes">적립시간 (분)</Label>
                          <Select
                            value={timeMinutes.toString()}
                            onValueChange={(value) => setTimeMinutes(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10분</SelectItem>
                              <SelectItem value="20">20분</SelectItem>
                              <SelectItem value="30">30분</SelectItem>
                              <SelectItem value="60">60분</SelectItem>
                              <SelectItem value="120">120분</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleGrantRewards}
                    disabled={grantLoading}
                    className="w-full"
                  >
                    {grantLoading ? "처리 중..." : (grantType === 'coupon' ? '쿠폰 발급' : '적립시간 추가')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 