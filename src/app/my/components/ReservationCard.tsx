"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ExtensionButton } from "@/components/reservation";
import type { Reservation } from '@/types/reservation';
// 유틸리티 함수 import
import { formatTimeString, canWriteReview } from "@/features/my-page/utils/reservation-helpers";
import { getStatusIcon, getStatusColorClass, getStatusText } from "@/features/my-page/utils/status-helpers";

type FilterType = 'upcoming' | 'completed' | 'cancelled';

interface ReservationCardProps {
  reservation: Reservation;
  activeFilter: FilterType;
  onCardClick: () => void;
  onExtensionClick: () => void;
}

export function ReservationCard({
  reservation,
  activeFilter,
  onCardClick,
  onExtensionClick
}: ReservationCardProps) {
  
  return (
    <Card 
      className="overflow-hidden hover:bg-gray-50 cursor-pointer"
      onClick={onCardClick}
    >
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {reservation.service?.name || '알 수 없는 서비스'}
              </h3>
              <Badge className={`${getStatusColorClass(reservation)} flex items-center gap-1.5 text-sm font-medium px-3 py-1`}>
                {getStatusIcon(reservation)}
                {getStatusText(reservation)}
              </Badge>
              
              {reservation.status === 'cancelled' && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">취소 처리 완료</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">
                {format(parseISO(reservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                <br />
                {formatTimeString(reservation.start_time)} ~ {formatTimeString(reservation.end_time)}
              </p>
              <p className="font-medium">
                {reservation.total_price?.toLocaleString() || 0}원
              </p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {reservation.company_name && (
                  <span className="mr-2">회사명: {reservation.company_name}</span>
                )}
                {reservation.purpose && (
                  <span>촬영 목적: {reservation.purpose}</span>
                )}
              </p>
            </div>
            
            <div className="flex gap-2">
              {/* 예약 연장 버튼 - 이용 예정 탭의 active 예약에만 표시 */}
              {activeFilter === 'upcoming' && 
                (reservation.status === 'confirmed' || reservation.status === 'modified') && (
                <ExtensionButton
                  reservation={reservation}
                  onExtensionClick={() => onExtensionClick()}
                  disabled={false}
                />
              )}
              
              {/* 리뷰 작성 버튼 - 완료 탭에서 리뷰 작성 가능한 예약에만 표시 */}
              {activeFilter === 'completed' && canWriteReview(reservation) && (
                <Link 
                  href={`/my/reviews/write/${reservation.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="outline" size="sm">리뷰 작성</Button>
                </Link>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick();
                }}
              >
                상세보기
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 