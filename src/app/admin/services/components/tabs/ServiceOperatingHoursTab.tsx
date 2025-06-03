"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperatingHours } from "../../hooks/useOperatingHours";

type ServiceOperatingHoursTabProps = {
  serviceId: string;
};

// 요일 라벨
const dayLabels = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// 30분 단위 시간 옵션 생성 함수
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({
        value: timeString,
        label: timeString
      });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

export function ServiceOperatingHoursTab({ serviceId }: ServiceOperatingHoursTabProps) {
  const {
    operatingHours,
    loadingOperatingHours,
    savingOperatingHours,
    operatingHoursMessage,
    handleOperatingHourChange,
    handleSaveOperatingHours
  } = useOperatingHours(serviceId);
  
  return (
    <div className="space-y-6">
      {operatingHoursMessage && (
        <Alert 
          className={`${
            operatingHoursMessage.type === 'success' ? 'bg-green-100 text-green-800' : 
            operatingHoursMessage.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}
        >
          <AlertDescription>{operatingHoursMessage.text}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        <div className="font-medium text-lg">예약 가능 시간 설정</div>
        <p className="text-sm text-gray-500">
          요일별로 예약 가능한 시간을 설정하세요. 휴무일로 설정하면 해당 요일에는 예약을 받지 않습니다.
        </p>
        
        {loadingOperatingHours ? (
          <div className="flex justify-center p-4">
            <div className="w-6 h-6 border-2 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {operatingHours.map((hour) => (
              <div key={hour.day_of_week} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">{dayLabels[hour.day_of_week]}</div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`closed-${hour.day_of_week}`} className="text-sm">
                      휴무일
                    </Label>
                    <Switch
                      id={`closed-${hour.day_of_week}`}
                      checked={hour.is_closed}
                      onCheckedChange={(checked: boolean) => 
                        handleOperatingHourChange(hour.day_of_week, 'is_closed', checked)
                      }
                    />
                  </div>
                </div>
                
                {!hour.is_closed && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`start-${hour.day_of_week}`}>시작 시간</Label>
                      <Select
                        value={hour.start_time}
                        onValueChange={(value) => 
                          handleOperatingHourChange(hour.day_of_week, 'start_time', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="시작 시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${hour.day_of_week}`}>종료 시간</Label>
                      <Select
                        value={hour.end_time}
                        onValueChange={(value) => 
                          handleOperatingHourChange(hour.day_of_week, 'end_time', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="종료 시간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {hour.is_closed && (
                  <div className="text-center py-4 text-gray-500">
                    휴무일로 설정되었습니다.
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex justify-end">
              <Button
                onClick={handleSaveOperatingHours}
                disabled={savingOperatingHours}
                className="px-6"
              >
                {savingOperatingHours ? (
                  <>
                    <span className="mr-2">저장 중...</span>
                    <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div>
                  </>
                ) : '운영시간 저장'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 