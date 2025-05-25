/**
 * Studio API Service
 * 스튜디오 관련 API 호출 함수들
 */

import { AppError } from '@/shared/types';
import type {
  Studio,
  StudioService,
  StudioSearchParams,
  StudioAvailability,
  StudioFormData,
  StudioStats
} from '../types';

// Base API configuration
const API_BASE = '/api/studios';

export const studioApi = {
  // Studio CRUD Operations
  async getStudios(params?: StudioSearchParams): Promise<{
    studios: Studio[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v.toString()));
            } else {
              searchParams.append(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(`${API_BASE}?${searchParams}`);
      
      if (!response.ok) {
        throw new AppError(
          `Failed to fetch studios: ${response.statusText}`,
          'FETCH_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to fetch studios',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  async getStudio(id: string): Promise<Studio> {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(
            'Studio not found',
            'NOT_FOUND',
            404
          );
        }
        throw new AppError(
          `Failed to fetch studio: ${response.statusText}`,
          'FETCH_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to fetch studio',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  async createStudio(data: StudioFormData): Promise<Studio> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new AppError(
          `Failed to create studio: ${response.statusText}`,
          'CREATE_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to create studio',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  async updateStudio(id: string, data: Partial<StudioFormData>): Promise<Studio> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new AppError(
          `Failed to update studio: ${response.statusText}`,
          'UPDATE_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to update studio',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  async deleteStudio(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new AppError(
          `Failed to delete studio: ${response.statusText}`,
          'DELETE_ERROR',
          response.status
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to delete studio',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  // Studio Services
  async getStudioServices(studioId: string): Promise<StudioService[]> {
    try {
      const response = await fetch(`${API_BASE}/${studioId}/services`);
      
      if (!response.ok) {
        throw new AppError(
          `Failed to fetch studio services: ${response.statusText}`,
          'FETCH_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to fetch studio services',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  // Studio Availability
  async getStudioAvailability(
    studioId: string,
    startDate: string,
    endDate: string
  ): Promise<StudioAvailability[]> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(`${API_BASE}/${studioId}/availability?${params}`);
      
      if (!response.ok) {
        throw new AppError(
          `Failed to fetch studio availability: ${response.statusText}`,
          'FETCH_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to fetch studio availability',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },

  // Studio Statistics (Admin)
  async getStudioStats(studioId: string): Promise<StudioStats> {
    try {
      const response = await fetch(`${API_BASE}/${studioId}/stats`);
      
      if (!response.ok) {
        throw new AppError(
          `Failed to fetch studio statistics: ${response.statusText}`,
          'FETCH_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      throw new AppError(
        'Failed to fetch studio statistics',
        'NETWORK_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  },
};
