"use client"

import React, { useEffect, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { format, addMinutes, setHours, setMinutes } from "date-fns"
import { ko } from "date-fns/locale"
import { Clock } from "lucide-react"
import { generateTimeSlots } from "@/lib/date-utils"
import { TimeSlot } from "@/types"

export default function MinimalCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])

  // 날짜 선택 시 시간 슬롯 생성
  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      // 날짜가 변경되면 선택된 시간 슬롯을 초기화
      setSelectedTimeSlots([]);
      
      // 9시부터 18시까지 30분 단위로 시간 슬롯 생성
      const slots = generateTimeSlots(newDate);
      
      // 시간 슬롯 상태 설정 (모두 예약 가능하도록)
      const newTimeSlots: TimeSlot[] = slots.map(time => ({
        time,
        status: 'available'
      }));
      
      setTimeSlots(newTimeSlots);
    }
  };

  // 시간 슬롯 클릭 핸들러
  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (slot.status !== 'available') return; // 예약 불가능한 슬롯은 클릭 무시
    
    setSelectedTimeSlots(prev => {
      const isSelected = prev.includes(slot.time);
      
      // 이미 선택된 시간이면 제거
      if (isSelected) {
        return prev.filter(time => time !== slot.time);
      }
      
      // 새로운 시간 추가
      return [...prev, slot.time].sort();
    });
  };
  
  // 컴포넌트 마운트 시 현재 날짜에 대한 시간 슬롯 생성
  useEffect(() => {
    if (date) {
      handleDateSelect(date);
    }
  }, []);
  
  // 선택된 시간 슬롯 정보 계산
  const getTimeRange = () => {
    if (selectedTimeSlots.length === 0) return null;
    
    const sorted = [...selectedTimeSlots].sort();
    return {
      start: sorted[0],
      end: sorted[selectedTimeSlots.length - 1],
      totalMinutes: selectedTimeSlots.length * 30
    };
  };
  
  const timeRange = getTimeRange();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">미니멀 스타일 캘린더와 시간 선택</h1>
      
      <div className="max-w-lg mx-auto">
        <div className="rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">통합된 월/년 네비게이터가 있는 캘린더</h2>
          <div className="flex flex-col items-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              className="rounded-md"
            />
            
            {date && (
              <div className="mt-6 p-4 bg-slate-100 rounded w-full">
                <p className="text-sm text-slate-600 mb-1">선택된 날짜:</p>
                <p className="text-lg font-medium">
                  {format(date, 'yyyy년 M월 d일 EEEE', { locale: ko })}
                </p>
              </div>
            )}
            
            {/* 시간 슬롯 선택 영역 */}
            <div className="mt-6 w-full">
              <h3 className="flex items-center text-lg font-medium mb-2">
                <Clock className="h-5 w-5 mr-2" />
                시간 선택
              </h3>
              
              {timeSlots.length > 0 ? (
                <>
                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs mb-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                        <span>선택됨</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-white border border-gray-200 mr-1"></div>
                        <span>가능</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSlotClick(slot)}
                        className={`py-2 text-sm rounded-md border transition-colors duration-200 ${
                          selectedTimeSlots.includes(slot.time)
                            ? "bg-blue-500 text-white border-blue-500 font-medium"
                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-500"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-gray-100 h-36 rounded-lg flex items-center justify-center text-gray-500">
                  날짜를 선택하면 예약 가능한 시간이 표시됩니다
                </div>
              )}
            </div>
            
            {/* 선택된 시간 요약 */}
            {timeRange && (
              <div className="mt-6 p-4 bg-blue-50 rounded w-full">
                <h4 className="font-medium mb-2">선택된 시간</h4>
                <p className="text-sm text-gray-600 mb-1">
                  시간: {timeRange.start} ~ {timeRange.end}
                </p>
                <p className="text-sm text-gray-600">
                  총 {timeRange.totalMinutes}분
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>캘린더에서 날짜를 선택하면 시간 슬롯이 표시됩니다.</p>
          <p>원하는 시간 슬롯을 클릭하여 선택하거나 해제할 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
} 