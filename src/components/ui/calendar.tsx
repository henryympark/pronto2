"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ButtonProps, DayPicker } from "react-day-picker"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { MonthYearNavigator } from "./month-year-navigator"

import "./calendar.css"

// 타입 에러는 무시하고 진행
export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // 캘린더 내부 상태로 현재 표시 월을 관리
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())

  // 네비게이터 컴포넌트로부터 월이 변경될 때 호출
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    props.onMonthChange?.(date);
  };

  // 이전 달 버튼 커스텀 컴포넌트 (미니멀 스타일)
  const PreviousMonthButton = (btnProps: ButtonProps) => {
    return (
      <button
        {...btnProps}
        className={cn(btnProps.className, "calendar-nav-prev")}
      >
        <ChevronLeft className="calendar-nav-icon" />
        <span className="sr-only">이전 달</span>
      </button>
    );
  };

  // 다음 달 버튼 커스텀 컴포넌트 (미니멀 스타일)
  const NextMonthButton = (btnProps: ButtonProps) => {
    return (
      <button
        {...btnProps}
        className={cn(btnProps.className, "calendar-nav-next")}
      >
        <ChevronRight className="calendar-nav-icon" />
        <span className="sr-only">다음 달</span>
      </button>
    );
  };
  
  return (
    <div className="calendar-container">
      {/* 커스텀 월/년 네비게이터 */}
      <div className="mb-4">
        <MonthYearNavigator
          date={currentMonth}
          onDateChange={handleMonthChange}
        />
      </div>
      
      {/* 기본 캡션을 숨기고 날짜 그리드만 표시 */}
      <DayPicker
        mode="single"
        locale={ko}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        weekStartsOn={0}
        showOutsideDays={showOutsideDays}
        fixedWeeks={true}
        numberOfMonths={1}
        showWeekNumber={false}
        className={cn("calendar-grid-wrapper", className)}
        modifiersClassNames={{
          outside: "day-outside",
          today: "day-today",
          selected: "day-selected",
        }}
        classNames={{
          months: "calendar-months",
          month: "calendar-month",
          caption: "sr-only hidden", // 캡션 완전히 숨김
          nav: "hidden", // 기본 네비게이션을 숨김
          month_grid: "calendar-grid",
          weekdays: "calendar-weekdays",
          weekday: "calendar-weekday",
          week: "calendar-week",
          day: "calendar-day-cell",
          day_button: "calendar-day",
          selected: "day-selected",
          today: "day-today", 
          outside: "day-outside",
          disabled: "day-disabled",
          hidden: "day-hidden",
          ...classNames,
        }}
        {...props}
      />
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar } 