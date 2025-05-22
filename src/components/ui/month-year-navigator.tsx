"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, format, subMonths } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface MonthYearNavigatorProps {
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
}

export function MonthYearNavigator({
  date,
  onDateChange,
  className,
  disablePrevious = false,
  disableNext = false,
}: MonthYearNavigatorProps) {
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
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousMonth}
        disabled={disablePrevious}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">이전 달</span>
      </Button>
      
      <div className="text-center font-medium">
        {format(date, "yyyy년 MMMM", { locale: ko })}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={disableNext}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">다음 달</span>
      </Button>
    </div>
  )
} 