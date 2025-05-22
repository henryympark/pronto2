"use client";

import { timeToMinutes, formatMinutesToTime } from "@/lib/date-utils";

interface TimeRangeInfoProps {
  selectedSlots: string[];
  slotDuration?: number; // 분 단위 (기본값: 30분)
}

export default function TimeRangeInfo({ 
  selectedSlots,
  slotDuration = 30
}: TimeRangeInfoProps) {
  if (selectedSlots.length === 0) {
    return null;
  }
  
  // 선택된 시간 슬롯을 시간순으로 정렬
  const sortedSlots = [...selectedSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const startTime = sortedSlots[0];
  
  // 마지막 슬롯 시간에서 슬롯 간격을 더한 시간이 종료 시간
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const lastSlotMinutes = timeToMinutes(lastSlot);
  const endTimeMinutes = lastSlotMinutes + slotDuration;
  const endTime = formatMinutesToTime(endTimeMinutes);
  
  const totalHours = selectedSlots.length * slotDuration / 60;
  
  return (
    <div className="mt-4 p-3 bg-pronto-gray-50 border border-pronto-gray-200 rounded-md">
      <div className="text-sm font-medium">선택한 시간</div>
      <div className="flex flex-wrap gap-2 mt-1">
        <div className="text-sm">
          <span className="font-medium">{startTime}</span>
          <span> ~ </span>
          <span className="font-medium">{endTime}</span>
          <span className="ml-2">
            (총 {totalHours} 시간)
          </span>
        </div>
      </div>
    </div>
  );
} 