/**
 * Booking 유효성 검사 서비스
 * 예약 생성/수정 시 데이터 유효성 검사
 */

import { parseISO, isAfter, isBefore, startOfDay, isValid as isValidDate } from 'date-fns';
import { BookingFormData, BookingFormErrors, CreateBookingRequest } from '../types';
import { validateBookingTime, isBookingAvailable } from './bookingUtils';
import type { Booking } from '../types';

/**
 * 예약 폼 데이터 유효성 검사
 */
export const validateBookingForm = (
  data: BookingFormData,
  existingBookings: Booking[] = []
): { isValid: boolean; errors: BookingFormErrors } => {
  const errors: BookingFormErrors = {};
  
  // 서비스 ID 검사
  if (!data.serviceId || data.serviceId.trim() === '') {
    errors.serviceId = '서비스를 선택해주세요.';
  }
  
  // 예약 날짜 검사
  if (!data.reservationDate) {
    errors.reservationDate = '예약 날짜를 선택해주세요.';
  } else {
    const reservationDate = parseISO(data.reservationDate);
    const today = startOfDay(new Date());
    
    if (!isValidDate(reservationDate)) {
      errors.reservationDate = '올바른 날짜 형식이 아닙니다.';
    } else if (isBefore(reservationDate, today)) {
      errors.reservationDate = '과거 날짜는 예약할 수 없습니다.';
    }
  }
  
  // 시작 시간 검사
  if (!data.startTime) {
    errors.startTime = '시작 시간을 선택해주세요.';
  }
  
  // 종료 시간 검사
  if (!data.endTime) {
    errors.endTime = '종료 시간을 선택해주세요.';
  }
  
  // 시간 유효성 및 가용성 검사
  if (data.startTime && data.endTime && data.reservationDate) {
    const timeValidation = validateBookingTime(data.startTime, data.endTime, data.reservationDate);
    if (!timeValidation.isValid) {
      errors.startTime = timeValidation.error;
    }
  }
  
  // 예약 시간 검사
  if (data.totalHours <= 0) {
    errors.totalHours = '예약 시간은 0보다 커야 합니다.';
  }
  
  // 총 가격 검사
  if (data.totalPrice <= 0) {
    errors.totalPrice = '총 가격은 0보다 커야 합니다.';
  }
  
  // 참여자 수 검사 (선택사항)
  if (data.participants !== undefined && data.participants < 1) {
    errors.participants = '참여자 수는 1명 이상이어야 합니다.';
  }
  
  // 메모 길이 검사 (선택사항)
  if (data.notes && data.notes.length > 500) {
    errors.notes = '메모는 500자 이하로 입력해주세요.';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return { isValid, errors };
};

/**
 * 예약 생성 요청 데이터 유효성 검사
 */
export const validateCreateBookingRequest = (
  data: CreateBookingRequest
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.reservationDate) {
    errors.push('예약 날짜가 필요합니다.');
  } else {
    const reservationDate = parseISO(data.reservationDate);
    if (!isValidDate(reservationDate) || isBefore(reservationDate, startOfDay(new Date()))) {
      errors.push('올바른 예약 날짜를 입력해주세요.');
    }
  }
  
  if (!data.startTime) {
    errors.push('시작 시간이 필요합니다.');
  }
  
  if (!data.endTime) {
    errors.push('종료 시간이 필요합니다.');
  }
  
  if (data.startTime && data.endTime && data.reservationDate) {
    const timeValidation = validateBookingTime(data.startTime, data.endTime, data.reservationDate);
    if (!timeValidation.isValid) {
      errors.push(timeValidation.error || '올바른 시간을 입력해주세요.');
    }
  }
  
  if (data.totalHours <= 0) {
    errors.push('예약 시간은 0보다 커야 합니다.');
  }
  
  if (data.totalPrice <= 0) {
    errors.push('총 가격은 0보다 커야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 예약 시간 충돌 검사
 */
export const validateBookingConflicts = (
  newBooking: {
    reservationDate: string;
    startTime: string;
    endTime: string;
  },
  existingBookings: Booking[],
  excludeBookingId?: string
): { hasConflict: boolean; conflictingBookings: Booking[] } => {
  const startDateTime = `${newBooking.reservationDate}T${newBooking.startTime}:00`;
  const endDateTime = `${newBooking.reservationDate}T${newBooking.endTime}:00`;
  
  const conflictingBookings = existingBookings.filter(booking => {
    // 제외할 예약 ID가 있는 경우 (수정 시)
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }
    
    // 취소된 예약은 제외
    if (booking.status === 'canceled') {
      return false;
    }
    
    const bookingStart = parseISO(booking.start_time);
    const bookingEnd = parseISO(booking.end_time);
    const newStart = parseISO(startDateTime);
    const newEnd = parseISO(endDateTime);
    
    // 시간 격충 체크
    return (
      (newStart >= bookingStart && newStart < bookingEnd) ||
      (newEnd > bookingStart && newEnd <= bookingEnd) ||
      (newStart <= bookingStart && newEnd >= bookingEnd)
    );
  });
  
  return {
    hasConflict: conflictingBookings.length > 0,
    conflictingBookings
  };
};

/**
 * 비즈니스 규칙 유효성 검사
 */
export const validateBusinessRules = (
  bookingData: {
    reservationDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
  }
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 1. 최소 예약 시간 체크 (1시간)
  const startDateTime = parseISO(`${bookingData.reservationDate}T${bookingData.startTime}:00`);
  const endDateTime = parseISO(`${bookingData.reservationDate}T${bookingData.endTime}:00`);
  const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  
  if (durationHours < 1) {
    errors.push('최소 1시간 이상 예약해야 합니다.');
  }
  
  // 2. 최대 예약 시간 체크 (8시간)
  if (durationHours > 8) {
    errors.push('최대 8시간까지만 예약 가능합니다.');
  }
  
  // 3. 예약 가능 시간대 체크 (09:00 - 22:00)
  const startHour = startDateTime.getHours();
  const endHour = endDateTime.getHours();
  const endMinute = endDateTime.getMinutes();
  
  if (startHour < 9 || startHour >= 22) {
    errors.push('예약 가능 시간은 09:00 - 22:00 입니다.');
  }
  
  if (endHour > 22 || (endHour === 22 && endMinute > 0)) {
    errors.push('예약 종료 시간은 22:00을 초과할 수 없습니다.');
  }
  
  // 4. 예약 사전 시간 체크 (1시간 전)
  const now = new Date();
  const timeDiffHours = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (timeDiffHours < 1) {
    errors.push('예약은 최소 1시간 전에 해주세요.');
  }
  
  // 5. 최대 예약 가능 기간 체크 (30일)
  const maxAdvanceDays = 30;
  const daysDiff = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > maxAdvanceDays) {
    errors.push(`최대 ${maxAdvanceDays}일 전까지만 예약 가능합니다.`);
  }
  
  // 6. 최소 가격 체크
  const minimumPrice = 10000; // 1만원
  if (bookingData.totalPrice < minimumPrice) {
    errors.push(`최소 예약 금액은 ${minimumPrice.toLocaleString()}원 입니다.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 예약 수정 가능 여부 검사
 */
export const validateBookingModification = (
  originalBooking: Booking,
  newData: Partial<BookingFormData>
): { canModify: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 1. 예약 상태 체크
  if (originalBooking.status === 'completed') {
    errors.push('완료된 예약은 수정할 수 없습니다.');
  }
  
  if (originalBooking.status === 'canceled') {
    errors.push('취소된 예약은 수정할 수 없습니다.');
  }
  
  // 2. 예약 시간 전 수정 가능 시간 체크 (2시간 전)
  const bookingStart = parseISO(originalBooking.start_time);
  const now = new Date();
  const timeDiffHours = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (timeDiffHours < 2) {
    errors.push('예약 시작 2시간 전까지만 수정 가능합니다.');
  }
  
  // 3. 수정 횟수 체크
  if (originalBooking.status === 'modified') {
    // 수정 히스토리를 확인하여 너무 빈번한 수정 방지
    // TODO: 수정 히스토리 테이블이 있다면 체크
  }
  
  return {
    canModify: errors.length === 0,
    errors
  };
};

/**
 * 예약 취소 가능 여부 및 취소비 계산
 */
export const validateBookingCancellation = (
  booking: Booking
): { canCancel: boolean; refundAmount: number; cancellationFee: number; errors: string[] } => {
  const errors: string[] = [];
  const totalPrice = booking.total_price;
  let refundAmount = totalPrice;
  let cancellationFee = 0;
  
  // 1. 예약 상태 체크
  if (booking.status === 'completed') {
    errors.push('완료된 예약은 취소할 수 없습니다.');
    return { canCancel: false, refundAmount: 0, cancellationFee: 0, errors };
  }
  
  if (booking.status === 'canceled') {
    errors.push('이미 취소된 예약입니다.');
    return { canCancel: false, refundAmount: 0, cancellationFee: 0, errors };
  }
  
  // 2. 취소 시점에 따른 취소비 계산
  const bookingStart = parseISO(booking.start_time);
  const now = new Date();
  const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilBooking < 0) {
    errors.push('예약 시간이 지난 예약은 취소할 수 없습니다.');
    return { canCancel: false, refundAmount: 0, cancellationFee: 0, errors };
  }
  
  // 취소비 정책
  if (hoursUntilBooking >= 24) {
    // 24시간 전: 전액 환불
    cancellationFee = 0;
    refundAmount = totalPrice;
  } else if (hoursUntilBooking >= 6) {
    // 6-24시간 전: 20% 취소비
    cancellationFee = Math.round(totalPrice * 0.2);
    refundAmount = totalPrice - cancellationFee;
  } else if (hoursUntilBooking >= 2) {
    // 2-6시간 전: 50% 취소비
    cancellationFee = Math.round(totalPrice * 0.5);
    refundAmount = totalPrice - cancellationFee;
  } else {
    // 2시간 전: 100% 취소비 (환불 불가)
    cancellationFee = totalPrice;
    refundAmount = 0;
  }
  
  return {
    canCancel: errors.length === 0,
    refundAmount,
    cancellationFee,
    errors
  };
};
