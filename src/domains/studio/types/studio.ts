/**
 * Studio Domain - Types
 * 스튜디오/서비스 관련 타입 정의
 */

// Base Studio Types
export interface Studio {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  address: string;
  region: string;
  district: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  priceRange: {
    min: number;
    max: number;
  };
  amenities: string[];
  operatingHours: OperatingHours;
  availability: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  monday: TimeSlot | null;
  tuesday: TimeSlot | null;
  wednesday: TimeSlot | null;
  thursday: TimeSlot | null;
  friday: TimeSlot | null;
  saturday: TimeSlot | null;
  sunday: TimeSlot | null;
}

export interface TimeSlot {
  open: string; // HH:mm format
  close: string; // HH:mm format
}

// Studio Service Types
export interface StudioService {
  id: string;
  studioId: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  duration: number; // in minutes
  price: number;
  maxParticipants?: number;
  equipment?: string[];
  requirements?: string[];
  isActive: boolean;
}

export type ServiceCategory = 
  | 'photo_studio'
  | 'recording_studio'
  | 'dance_studio'
  | 'fitness_studio'
  | 'rehearsal_room'
  | 'event_space'
  | 'other';

// Studio Search & Filter Types
export interface StudioSearchParams {
  query?: string;
  region?: string;
  district?: string;
  category?: ServiceCategory;
  priceMin?: number;
  priceMax?: number;
  amenities?: string[];
  rating?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  sortBy?: StudioSortOption;
  page?: number;
  limit?: number;
}

export type StudioSortOption = 
  | 'rating'
  | 'price_low'
  | 'price_high'
  | 'distance'
  | 'newest'
  | 'popularity';

// Studio Details & Booking Types
export interface StudioAvailability {
  date: string;
  timeSlots: TimeSlotAvailability[];
}

export interface TimeSlotAvailability {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price?: number;
  serviceId?: string;
}

// Studio Management Types (for admin)
export interface StudioFormData {
  name: string;
  description?: string;
  address: string;
  region: string;
  district: string;
  phone?: string;
  email?: string;
  website?: string;
  amenities: string[];
  operatingHours: OperatingHours;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface StudioStats {
  totalBookings: number;
  revenue: number;
  averageRating: number;
  occupancyRate: number;
  popularTimeSlots: string[];
}
