"use client";

import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReservationCard } from "./ReservationCard";
import type { Reservation } from '@/types/reservation';

type FilterType = 'upcoming' | 'completed' | 'cancelled';

interface ReservationListProps {
  reservations: Reservation[];
  isLoading: boolean;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onReservationClick: (reservation: Reservation) => void;
  onExtensionClick: (reservation: Reservation) => void;
  hasError?: boolean;
  errorMessage?: string;
}

export function ReservationList({
  reservations,
  isLoading,
  activeFilter,
  onFilterChange,
  onReservationClick,
  onExtensionClick,
  hasError = false,
  errorMessage = "",
}: ReservationListProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-6">예약 내역</h2>
      
      {/* 필터링 탭 */}
      <Tabs 
        defaultValue="upcoming" 
        className="mb-6" 
        onValueChange={(value) => onFilterChange(value as FilterType)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">예약 현황</TabsTrigger>
          <TabsTrigger value="completed">이용 완료</TabsTrigger>
          <TabsTrigger value="cancelled">취소 내역</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-600">예약 내역을 불러오는 중...</span>
        </div>
      ) : reservations.length === 0 ? (
        /* 빈 상태 */
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">예약 내역이 없습니다.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button>서비스 둘러보기</Button>
          </Link>
        </div>
      ) : (
        /* 예약 목록 */
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              activeFilter={activeFilter}
              onCardClick={() => onReservationClick(reservation)}
              onExtensionClick={() => onExtensionClick(reservation)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 