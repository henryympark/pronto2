"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, format, subMonths } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface MinimalMonthYearNavigatorProps {
  /** 현재 선택된 날짜 */
  date: Date
  /** 날짜가 변경될 때 호출되는 콜백 함수 */
  onDateChange: (date: Date) => void
  /** 추가 스타일 클래스 */
  className?: string
  /** 좌측 버튼 비활성화 여부 */
  disablePrevious?: boolean
  /** 우측 버튼 비활성화 여부 */
  disableNext?: boolean
  /** 아이콘 색상 */
  iconColor?: string
  /** 아이콘 크기 */
  iconSize?: number
}

export function MinimalMonthYearNavigator({
  date,
  onDateChange,
  className,
  disablePrevious = false,
  disableNext = false,
  iconColor = "#666",
  iconSize = 16
}: MinimalMonthYearNavigatorProps) {
  const handlePreviousMonth = () => {
    if (!disablePrevious) {
      onDateChange(subMonths(date, 1))
    }
  }

  const handleNextMonth = () => {
    if (!disableNext) {
      onDateChange(addMonths(date, 1))
    }
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-2 w-full", 
        className
      )}
    >
      <button
        onClick={handlePreviousMonth}
        disabled={disablePrevious}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors",
          disablePrevious && "opacity-40 cursor-not-allowed hover:bg-transparent"
        )}
      >
        <ChevronLeft 
          style={{ color: iconColor }} 
          width={iconSize} 
          height={iconSize} 
        />
        <span className="sr-only">이전 달</span>
      </button>
      
      <div className="text-center font-medium text-slate-800">
        {format(date, "yyyy년 MMMM", { locale: ko })}
      </div>
      
      <button
        onClick={handleNextMonth}
        disabled={disableNext}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors",
          disableNext && "opacity-40 cursor-not-allowed hover:bg-transparent"
        )}
      >
        <ChevronRight 
          style={{ color: iconColor }} 
          width={iconSize} 
          height={iconSize} 
        />
        <span className="sr-only">다음 달</span>
      </button>
    </div>
  )
} 