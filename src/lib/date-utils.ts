import { addMinutes, format, isAfter, isBefore, isSameDay, parse, setHours, setMinutes } from "date-fns";
import { ko } from "date-fns/locale";
import { OPERATION_START_TIME, OPERATION_END_TIME, TIME_SLOT_INTERVAL } from "@/constants/time";
import { DEFAULT_TIMEZONE, DATE_FORMATS } from "@/constants/region";

// 시간 문자열 "HH:MM" 형식을 Date 객체로 변환
export const parseTimeString = (timeString: string, date: Date): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return setMinutes(setHours(date, hours), minutes);
};

// Date 객체를 "HH:MM" 형식의 시간 문자열로 변환
export const formatTimeString = (date: Date): string => {
  return format(date, "HH:mm");
};

// 운영 시간 상수는 constants/time.ts로 이동했으므로 여기서는 export만 함
export { OPERATION_START_TIME, OPERATION_END_TIME };

// 30분 단위로 시간 슬롯 생성 (시작시간, 종료시간 포함)
export const generateTimeSlots = (date: Date): string[] => {
  const slots: string[] = [];
  const startDate = parseTimeString(OPERATION_START_TIME, date);
  const endDate = parseTimeString(OPERATION_END_TIME, date);
  
  let currentSlot = startDate;
  
  while (isBefore(currentSlot, endDate) || formatTimeString(currentSlot) === OPERATION_END_TIME) {
    slots.push(formatTimeString(currentSlot));
    currentSlot = addMinutes(currentSlot, TIME_SLOT_INTERVAL);
  }
  
  // 마지막에 24:00 슬롯 추가
  slots.push("24:00");
  
  return slots;
};

// 날짜 포맷팅 (한국어)
export const formatDate = (date: Date): string => {
  return format(date, DATE_FORMATS.DISPLAY, { locale: ko });
};

// 예약 가능 시간인지 확인 (1분 전까지 가능)
export const isSlotAvailable = (timeSlot: string, date: Date): boolean => {
  const slotTime = parseTimeString(timeSlot, date);
  const now = new Date();
  const cutoffTime = addMinutes(now, 1); // 1분 전 마감
  
  return isAfter(slotTime, cutoffTime);
};

// 연속된 시간 슬롯인지 확인
export const isConsecutiveSlot = (
  selectedSlots: string[], 
  newSlot: string
): boolean => {
  if (selectedSlots.length === 0) return true;
  
  // 시간 슬롯을 숫자 값(분 단위)으로 변환하는 헬퍼 함수 - 중앙화된 함수 사용
  
  // 모든 슬롯을 시간 순으로 정렬
  const allTimeSlots = [...selectedSlots, newSlot];
  const sortedSlots = allTimeSlots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  
  // 이미 선택된 슬롯들이 연속된 시간인지 확인
  for (let i = 0; i < sortedSlots.length - 1; i++) {
    const currentTime = timeToMinutes(sortedSlots[i]);
    const nextTime = timeToMinutes(sortedSlots[i + 1]);
    
    // 연속된 슬롯은 정확히 TIME_SLOT_INTERVAL 간격이어야 함
    if (nextTime - currentTime !== TIME_SLOT_INTERVAL) {
      return false;
    }
  }
  
  return true;
};

// 선택된 시간 슬롯의 시작/종료 시간 반환
export const getSelectedTimeRange = (selectedSlots: string[]) => {
  if (!selectedSlots.length) return { start: "", end: "" };
  
  const sortedSlots = [...selectedSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const startTime = sortedSlots[0];
  
  // 마지막 슬롯 시간에서 TIME_SLOT_INTERVAL을 더한 시간이 종료 시간
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const lastSlotMinutes = timeToMinutes(lastSlot);
  const endTimeMinutes = lastSlotMinutes + TIME_SLOT_INTERVAL;
  const endTime = formatMinutesToTime(endTimeMinutes);
  
  return { start: startTime, end: endTime };
};

/**
 * 시간 문자열(HH:MM)을 분 단위로 변환
 * @param time HH:MM 형식의 시간 문자열
 * @returns 분 단위 시간 (예: "01:30" -> 90)
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * 분을 시간 문자열(HH:MM)로 변환
 * @param minutes 분 단위 시간 (예: 90)
 * @returns HH:MM 형식의 시간 문자열 (예: "01:30")
 */
export const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

/**
 * 시간 문자열에서 초 부분 제거 (HH:MM:SS -> HH:MM)
 * @param timeStr HH:MM:SS 형식의 시간 문자열
 * @returns HH:MM 형식의 시간 문자열
 */
export const formatTimeWithoutSeconds = (timeStr: string): string => {
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return timeStr;
};

/**
 * 시간을 "시간 분" 형식으로 표시
 * @param minutes 분 단위 시간
 * @returns "X시간 Y분" 형식의 문자열
 */
export const formatTimeDisplay = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
};

// ======= 예약 연장 관련 함수들 =======

/**
 * Grace Period (10분) 내에 연장 가능한지 확인
 * @param reservationEndDateTime 예약 종료 시간 (Date 객체)
 * @returns 연장 가능 여부
 */
export const isWithinGracePeriod = (reservationEndDateTime: Date): boolean => {
  const now = new Date();
  const gracePeriodEnd = addMinutes(reservationEndDateTime, 10); // 예약 종료 후 10분까지
  
  return isBefore(now, gracePeriodEnd) && isAfter(now, reservationEndDateTime);
};

/**
 * 연장할 수 있는 최대 시간 계산 (Grace Period 내에서)
 * @param reservationEndDateTime 예약 종료 시간
 * @returns 연장 가능한 남은 분 수
 */
export const getRemainingGracePeriodMinutes = (reservationEndDateTime: Date): number => {
  const now = new Date();
  const gracePeriodEnd = addMinutes(reservationEndDateTime, 10);
  
  if (isAfter(now, gracePeriodEnd)) {
    return 0; // Grace Period 종료
  }
  
  if (isBefore(now, reservationEndDateTime)) {
    return 10; // 아직 예약 시간 중이므로 전체 Grace Period 가용
  }
  
  // 예약 종료 후 Grace Period 내
  const diffMs = gracePeriodEnd.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60)); // 분 단위로 변환
};

/**
 * 예약 날짜와 시간으로 Date 객체 생성
 * @param reservationDate 예약 날짜 (YYYY-MM-DD)
 * @param timeString 시간 문자열 (HH:MM)
 * @returns Date 객체
 */
export const createReservationDateTime = (reservationDate: string, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(reservationDate);
  return setMinutes(setHours(date, hours), minutes);
};

/**
 * 연장된 종료 시간 계산
 * @param currentEndDateTime 현재 종료 시간
 * @param extensionMinutes 연장할 분 수 (30의 배수)
 * @returns 연장된 종료 시간
 */
export const calculateExtendedEndTime = (currentEndDateTime: Date, extensionMinutes: number): Date => {
  return addMinutes(currentEndDateTime, extensionMinutes);
};

/**
 * 연장 시간이 30분 단위인지 검증
 * @param extensionMinutes 연장할 분 수
 * @returns 유효성 여부
 */
export const isValidExtensionTime = (extensionMinutes: number): boolean => {
  return extensionMinutes > 0 && extensionMinutes % 30 === 0;
}; 