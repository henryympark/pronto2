/**
 * Studio Utilities
 * 스튜디오 관련 유틸리티 함수들
 */

import type { 
  Studio, 
  StudioSearchParams, 
  ServiceCategory, 
  OperatingHours,
  TimeSlot
} from '../types';

/**
 * 스튜디오 가격 범위를 포맷팅
 */
export const formatPriceRange = (min: number, max: number): string => {
  if (min === max) {
    return `${min.toLocaleString()}원`;
  }
  return `${min.toLocaleString()}원 - ${max.toLocaleString()}원`;
};

/**
 * 서비스 카테고리를 한국어로 변환
 */
export const getServiceCategoryLabel = (category: ServiceCategory): string => {
  const labels: Record<ServiceCategory, string> = {
    photo_studio: '포토 스튜디오',
    recording_studio: '녹음 스튜디오',
    dance_studio: '댄스 스튜디오',
    fitness_studio: '피트니스 스튜디오',
    rehearsal_room: '연습실',
    event_space: '이벤트 공간',
    other: '기타',
  };
  
  return labels[category] || category;
};

/**
 * 운영시간을 문자열로 포맷팅
 */
export const formatOperatingHours = (hours: OperatingHours): string => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
  
  const openDays = days
    .map((day, index) => {
      const slot = hours[day];
      if (!slot) return null;
      return {
        label: dayLabels[index],
        time: `${slot.open}-${slot.close}`,
      };
    })
    .filter(Boolean);
  
  if (openDays.length === 0) return '휴무';
  
  // 연속된 같은 시간대 그룹화
  const grouped: { days: string[]; time: string }[] = [];
  
  openDays.forEach((day) => {
    if (!day) return;
    
    const existing = grouped.find(g => g.time === day.time);
    if (existing) {
      existing.days.push(day.label);
    } else {
      grouped.push({ days: [day.label], time: day.time });
    }
  });
  
  return grouped
    .map(g => `${g.days.join('·')} ${g.time}`)
    .join(', ');
};

/**
 * 시간이 운영시간 내인지 확인
 */
export const isWithinOperatingHours = (
  hours: OperatingHours,
  day: number, // 0=Sunday, 1=Monday, ...
  time: string // HH:mm format
): boolean => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = dayNames[day];
  const slot = hours[dayName];
  
  if (!slot) return false;
  
  return time >= slot.open && time <= slot.close;
};

/**
 * 스튜디오 평점을 별점으로 표시
 */
export const formatRating = (rating?: number): string => {
  if (!rating) return '평점 없음';
  return `★ ${rating.toFixed(1)}`;
};

/**
 * 스튜디오 거리 계산 (추후 위치 기반 서비스용)
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // 지구의 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 소수점 1자리까지
};

/**
 * 검색 파라미터 유효성 검사
 */
export const validateSearchParams = (params: StudioSearchParams): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (params.priceMin && params.priceMax && params.priceMin > params.priceMax) {
    errors.push('최소 가격이 최대 가격보다 클 수 없습니다.');
  }
  
  if (params.rating && (params.rating < 0 || params.rating > 5)) {
    errors.push('평점은 0과 5 사이의 값이어야 합니다.');
  }
  
  if (params.date && new Date(params.date) < new Date()) {
    errors.push('예약 날짜는 오늘 이후여야 합니다.');
  }
  
  if (params.startTime && params.endTime && params.startTime >= params.endTime) {
    errors.push('시작 시간이 종료 시간보다 빨라야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 스튜디오 필터링 함수
 */
export const filterStudios = (
  studios: Studio[], 
  params: StudioSearchParams
): Studio[] => {
  return studios.filter(studio => {
    // 검색어 필터
    if (params.query) {
      const query = params.query.toLowerCase();
      const matchesName = studio.name.toLowerCase().includes(query);
      const matchesDescription = studio.description?.toLowerCase().includes(query);
      const matchesAddress = studio.address.toLowerCase().includes(query);
      
      if (!matchesName && !matchesDescription && !matchesAddress) {
        return false;
      }
    }
    
    // 지역 필터
    if (params.region && studio.region !== params.region) {
      return false;
    }
    
    if (params.district && studio.district !== params.district) {
      return false;
    }
    
    // 가격 필터
    if (params.priceMin && studio.priceRange.max < params.priceMin) {
      return false;
    }
    
    if (params.priceMax && studio.priceRange.min > params.priceMax) {
      return false;
    }
    
    // 평점 필터
    if (params.rating && (!studio.rating || studio.rating < params.rating)) {
      return false;
    }
    
    // 편의시설 필터
    if (params.amenities && params.amenities.length > 0) {
      const hasAllAmenities = params.amenities.every(amenity => 
        studio.amenities.includes(amenity)
      );
      if (!hasAllAmenities) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * 스튜디오 정렬 함수
 */
export const sortStudios = (
  studios: Studio[], 
  sortBy: StudioSearchParams['sortBy']
): Studio[] => {
  const sorted = [...studios];
  
  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    case 'price_low':
      return sorted.sort((a, b) => a.priceRange.min - b.priceRange.min);
    
    case 'price_high':
      return sorted.sort((a, b) => b.priceRange.max - a.priceRange.max);
    
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    case 'popularity':
      // 추후 예약 횟수나 조회수 기반으로 구현
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    case 'distance':
      // 추후 위치 기반으로 구현 (현재는 이름순)
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    
    default:
      return sorted;
  }
};

/**
 * 예약 가능한 시간대 생성
 */
export const generateTimeSlots = (
  startTime: string, // "09:00"
  endTime: string,   // "22:00"
  duration: number   // 60 (minutes)
): string[] => {
  const slots: string[] = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  const current = new Date(start);
  
  while (current < end) {
    const timeString = current.toTimeString().slice(0, 5);
    slots.push(timeString);
    current.setMinutes(current.getMinutes() + duration);
  }
  
  return slots;
};

/**
 * 편의시설 아이콘 매핑
 */
export const getAmenityIcon = (amenity: string): string => {
  const iconMap: Record<string, string> = {
    'wifi': '📶',
    'parking': '🅿️',
    'aircon': '❄️',
    'heating': '🔥',
    'soundproof': '🔇',
    'equipment': '🎵',
    'mirror': '🪞',
    'shower': '🚿',
    'cafe': '☕',
    'elevator': '🛗',
    'wheelchair': '♿',
    'storage': '🗄️',
  };
  
  return iconMap[amenity] || '✓';
};

/**
 * 스튜디오 이미지 URL 생성
 */
export const getStudioImageUrl = (
  studioId: string, 
  imageId?: string, 
  size: 'thumbnail' | 'medium' | 'large' = 'medium'
): string => {
  const baseUrl = '/images/studios';
  const sizeParam = size === 'thumbnail' ? '?w=300' : 
                   size === 'large' ? '?w=1200' : '?w=600';
  
  if (imageId) {
    return `${baseUrl}/${studioId}/${imageId}${sizeParam}`;
  }
  
  return `${baseUrl}/${studioId}/default${sizeParam}`;
};
