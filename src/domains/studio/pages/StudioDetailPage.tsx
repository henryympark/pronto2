/**
 * StudioDetailPage Component
 * 스튜디오 상세 페이지 로직 (app router와 분리)
 */

"use client";

import React from 'react';
import { useStudio, useStudioAvailability } from '../hooks';
import { StudioHeader, StudioImageGallery, StudioTabs } from '../components';
import { Loader2 } from 'lucide-react';

interface StudioDetailPageProps {
  studioId: string;
}

export const StudioDetailPage: React.FC<StudioDetailPageProps> = ({ studioId }) => {
  const { studio, isLoading: studioLoading, error: studioError } = useStudio({ 
    studioId 
  });

  const { 
    availability, 
    isLoading: availabilityLoading, 
    error: availabilityError 
  } = useStudioAvailability({
    studioId,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  if (studioLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-gray-600">스튜디오 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (studioError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600">{studioError}</p>
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">스튜디오를 찾을 수 없습니다</h2>
          <p className="text-gray-600">요청하신 스튜디오가 존재하지 않습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 이미지 갤러리 */}
        <div>
          <StudioImageGallery studio={studio} />
        </div>

        {/* 스튜디오 정보 */}
        <div>
          <StudioHeader studio={studio} />
          
          <div className="mt-8">
            <StudioTabs studio={studio} />
          </div>
        </div>
      </div>
    </div>
  );
};
