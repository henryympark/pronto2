"use client"

import React, { useState } from "react"
import { MonthYearNavigator } from "@/components/ui/month-year-navigator"
import { MinimalMonthYearNavigator } from "@/components/ui/month-year-navigator-minimal"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export default function MonthNavigatorExample() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [minimalDate, setMinimalDate] = useState<Date>(new Date())

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">월/년 네비게이터 예제</h1>
      
      <div className="max-w-md mx-auto border rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">기본 버전</h2>
        <MonthYearNavigator 
          date={currentDate}
          onDateChange={setCurrentDate}
          className="mb-4"
        />
        
        <div className="mt-6 p-4 bg-slate-100 rounded">
          <p className="text-sm font-medium">현재 선택된 날짜:</p>
          <p className="text-lg">{format(currentDate, 'yyyy년 M월 d일 EEEE', { locale: ko })}</p>
        </div>
      </div>
      
      <div className="max-w-md mx-auto border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">미니멀 버전</h2>
        <MinimalMonthYearNavigator 
          date={minimalDate}
          onDateChange={setMinimalDate}
          className="mb-4"
        />
        
        <div className="mt-6 p-4 bg-slate-100 rounded">
          <p className="text-sm font-medium">현재 선택된 날짜:</p>
          <p className="text-lg">{format(minimalDate, 'yyyy년 M월 d일 EEEE', { locale: ko })}</p>
        </div>
      </div>
    </div>
  )
} 