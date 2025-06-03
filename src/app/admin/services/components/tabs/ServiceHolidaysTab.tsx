"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useHolidayManagement } from "../../hooks/useHolidayManagement";

type ServiceHolidaysTabProps = {
  serviceId: string;
};

export function ServiceHolidaysTab({ serviceId }: ServiceHolidaysTabProps) {
  const {
    holidays,
    selectedDates,
    setSelectedDates,
    holidayDescription,
    setHolidayDescription,
    holidayMessage,
    loadingHolidays,
    savingHoliday,
    handleAddHoliday,
    handleDeleteHoliday
  } = useHolidayManagement(serviceId);
  
  return (
    <div className="space-y-6">
      {holidayMessage && (
        <Alert 
          className={`${
            holidayMessage.type === 'success' ? 'bg-green-100 text-green-800' : 
            holidayMessage.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}
        >
          <AlertDescription>{holidayMessage.text}</AlertDescription>
        </Alert>
      )}
      
      {/* 모바일 우선 1열 레이아웃 */}
      <div className="space-y-8">
        {/* 휴무일 설정 섹션 */}
        <div className="space-y-4">
          <div className="font-medium text-lg">휴무일 설정</div>
          <p className="text-sm text-gray-500">
            캘린더에서 휴무일로 지정할 날짜를 선택해주세요. 이미 등록된 휴무일은 빨간색으로 표시됩니다.
            여러 날짜를 한 번에 선택할 수 있습니다.
          </p>
          
          {/* 캘린더 */}
          <div className="p-4 border rounded-md bg-white">
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                required={false}
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                className="rounded-md"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                modifiers={{
                  holidays: holidays.map(h => new Date(h.holiday_date))
                }}
                modifiersClassNames={{
                  holidays: "bg-red-100 text-red-600 font-bold"
                }}
              />
            </div>
          </div>
          
          {/* 설명 입력 및 등록 버튼 */}
          <div className="space-y-3">
            <Label htmlFor="holiday-description">휴무일 설명 (선택사항)</Label>
            <Input
              id="holiday-description"
              value={holidayDescription}
              onChange={(e) => setHolidayDescription(e.target.value)}
              placeholder="예: 정기 휴무일, 공휴일, 시설 점검 등"
            />
            
            <Button
              onClick={handleAddHoliday}
              disabled={savingHoliday || selectedDates.length === 0}
              className="w-full"
            >
              {savingHoliday ? (
                <>
                  <span className="mr-2">저장 중...</span>
                  <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div>
                </>
              ) : '휴무일 등록하기'}
            </Button>
          </div>
        </div>
        
        {/* 등록된 휴무일 목록 섹션 */}
        <div className="space-y-4">
          <div className="font-medium text-lg">등록된 휴무일 목록</div>
          {loadingHolidays ? (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">등록된 휴무일이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => {
                const date = new Date(holiday.holiday_date);
                const isToday = new Date().toDateString() === date.toDateString();
                const isPast = date < new Date(new Date().toDateString());
                
                return (
                  <div 
                    key={holiday.id || holiday.holiday_date}
                    className={`
                      p-4 border rounded-lg flex items-center justify-between
                      ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'} 
                      ${isPast ? 'text-gray-400 bg-gray-50' : ''}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                        </span>
                        {isToday && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            오늘
                          </span>
                        )}
                      </div>
                      {holiday.description && (
                        <p className="text-sm text-gray-600 truncate">
                          {holiday.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteHoliday(holiday.holiday_date)}
                      title="휴무일 삭제"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 