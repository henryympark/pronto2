/**
 * Studio API Service
 * 스튜디오 관련 API 함수들
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AppError, ErrorCode, ErrorSeverity } from '@/types';
import type { 
  Studio, 
  StudioSearchParams, 
  StudioAvailability,
  StudioFormData,
  StudioStats
} from '../types';

// API 응답 타입
export interface StudioListResponse {
  studios: Studio[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 스튜디오 목록 조회
 */
export const getStudios = async (
  supabase: SupabaseClient,
  params: StudioSearchParams = {}
): Promise<StudioListResponse> => {
  try {
    let query = supabase
      .from('studios')
      .select('*', { count: 'exact' });

    // 검색 조건 적용
    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }

    if (params.region) {
      query = query.eq('region', params.region);
    }

    if (params.district) {
      query = query.eq('district', params.district);
    }

    if (params.priceMin !== undefined) {
      query = query.gte('price_range->min', params.priceMin);
    }

    if (params.priceMax !== undefined) {
      query = query.lte('price_range->max', params.priceMax);
    }

    // 정렬
    if (params.sortBy) {
      let orderColumn = 'created_at';
      let ascending = false;
      
      switch (params.sortBy) {
        case 'rating':
          orderColumn = 'rating';
          ascending = false;
          break;
        case 'price_low':
          orderColumn = 'price_range->min';
          ascending = true;
          break;
        case 'price_high':
          orderColumn = 'price_range->min';
          ascending = false;
          break;
        case 'newest':
          orderColumn = 'created_at';
          ascending = false;
          break;
      }
      
      query = query.order(orderColumn, { ascending });
    }

    // 페이지네이션
    const page = params.page || 1;
    const limit = params.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        `Database error: ${error.message}`,
        '스튜디오 목록을 불러오는데 실패했습니다.',
        ErrorSeverity.ERROR,
        { error }
      );
    }

    return {
      studios: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to fetch studios',
      '스튜디오 목록을 불러오는데 실패했습니다.',
      ErrorSeverity.ERROR,
      { error }
    );
  }
};

/**
 * 개별 스튜디오 조회
 */
export const getStudio = async (
  supabase: SupabaseClient,
  studioId: string
): Promise<Studio> => {
  try {
    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .eq('id', studioId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError(
          ErrorCode.RECORD_NOT_FOUND,
          'Studio not found',
          '스튜디오를 찾을 수 없습니다.',
          ErrorSeverity.WARNING
        );
      }
      
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to fetch studio: ${error.message}`,
        '스튜디오 정보를 불러오는데 실패했습니다.',
        ErrorSeverity.ERROR,
        { error }
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to fetch studio',
      '스튜디오 정보를 불러오는데 실패했습니다.',
      ErrorSeverity.ERROR,
      { error }
    );
  }
};

/**
 * 스튜디오 생성
 */
export const createStudio = async (
  supabase: SupabaseClient,
  studioData: StudioFormData
): Promise<Studio> => {
  try {
    const { data, error } = await supabase
      .from('studios')
      .insert(studioData)
      .select()
      .single();

    if (error) {
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to create studio: ${error.message}`,
        '스튜디오 생성에 실패했습니다.',
        ErrorSeverity.ERROR,
        { error }
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to create studio',
      '스튜디오 생성에 실패했습니다.',
      ErrorSeverity.ERROR,
      { error }
    );
  }
};

/**
 * 스튜디오 수정
 */
export const updateStudio = async (
  supabase: SupabaseClient,
  studioId: string,
  updateData: Partial<StudioFormData>
): Promise<Studio> => {
  try {
    const { data, error } = await supabase
      .from('studios')
      .update(updateData)
      .eq('id', studioId)
      .select()
      .single();

    if (error) {
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to update studio: ${error.message}`,
        '스튜디오 수정에 실패했습니다.',
        ErrorSeverity.ERROR,
        { error }
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to update studio',
      '스튜디오 수정에 실패했습니다.',
      ErrorSeverity.ERROR,
      { error }
    );
  }
};

/**
 * 스튜디오 가용성 조회
 */
export const getStudioAvailability = async (
  supabase: SupabaseClient,
  studioId: string,
  startDate: string,
  endDate: string
): Promise<StudioAvailability[]> => {
  try {
    // 실제 구현에서는 예약 데이터와 운영시간을 고려해서 가용성을 계산
    const { data, error } = await supabase
      .from('reservations')
      .select('reservation_date, start_time, end_time')
      .eq('service_id', studioId)
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDate)
      .eq('status', 'confirmed');

    if (error) {
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to fetch availability: ${error.message}`,
        '가용성 정보를 불러오는데 실패했습니다.',
        ErrorSeverity.ERROR,
        { error }
      );
    }

    // 임시로 빈 배열 반환 (실제로는 가용성 계산 로직 필요)
    return [];
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'Failed to fetch availability',
      '가용성 정보를 불러오는데 실패했습니다.',
      ErrorSeverity.ERROR,
      { error }
    );
  }
};

// studioApi 객체로 export (기존 코드와의 호환성을 위해)
export const studioApi = {
  getStudios: (params?: StudioSearchParams) => {
    // 실제 구현에서는 supabase 인스턴스를 어떻게 가져올지 결정 필요
    throw new Error('Not implemented - need supabase instance');
  },
  getStudio: (id: string) => {
    throw new Error('Not implemented - need supabase instance');
  },
  getStudioAvailability: (studioId: string, startDate: string, endDate: string) => {
    throw new Error('Not implemented - need supabase instance');
  }
};
