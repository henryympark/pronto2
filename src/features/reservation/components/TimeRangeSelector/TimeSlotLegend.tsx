"use client";

interface TimeSlotLegendProps {
  className?: string;
}

export default function TimeSlotLegend({ className }: TimeSlotLegendProps) {
  return (
    <div className={`flex gap-4 mt-4 text-xs text-pronto-gray-600 ${className || ''}`}>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-pronto-primary rounded-sm mr-1"></div>
        <span>선택됨</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-[#C0C2C5] rounded-sm mr-1"></div>
        <span>예약 불가</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-[#F3F4F6] border border-pronto-gray-200 rounded-sm mr-1"></div>
        <span>예약 가능</span>
      </div>
    </div>
  );
} 