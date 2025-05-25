/**
 * StudioDetailPage Component
 * 스튜디오 상세 페이지 로직 (app router와 분리)
 */

"use client";

import React from 'react';
import { useStudio, useStudioAvailability } from '../hooks';
import { StudioHeader, StudioImageGallery, StudioTabs } from '../components';
import { LoadingSpinner } from '@/shared/components/ui';
import { ErrorMessage } from '@/shared/components/ui';

interface StudioDetailPageProps {
  studioId: string;
}

export const StudioDetailPage = React.memo(({ studioId }: StudioDetailPageProps) => {
  const { studio, isLoading, error, refetch } = useStudio({ studioId });
  
  // 향후 7일간의 예약 가능 시간 조회
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { 
    availability, 
    isLoading: isAvailabilityLoading 
  } = useStudioAvailability({
    studioId,
    startDate,
    endDate,
    enabled: !!studio,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          title="스튜디오를 불러올 수 없습니다"
          description={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          title="스튜디오를 찾을 수 없습니다"
          description="요청하신 스튜디오가 존재하지 않거나 삭제되었습니다."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 이미지 갤러리 */}
          <StudioImageGallery studio={studio} />
          
          {/* 스튜디오 상세 탭 */}
          <StudioTabs studio={studio} />
        </div>
        
        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 스튜디오 헤더 정보 */}
          <StudioHeader studio={studio} />
          
          {/* 예약 위젯 (추후 구현) */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">예약하기</h3>
            <div className="text-center py-8 text-gray-500">
              <p>예약 시스템은 추후 구현 예정입니다.</p>
              {isAvailabilityLoading && (
                <p className="mt-2 text-sm">예약 가능 시간 확인 중...</p>
              )}
            </div>
          </div>
          
          {/* 연락처 */}
          {(studio.phone || studio.email) && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">문의하기</h3>
              <div className="space-y-2 text-sm">
                {studio.phone && (
                  <div>
                    <span className="text-gray-500">전화: </span>
                    <a 
                      href={`tel:${studio.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {studio.phone}
                    </a>
                  </div>
                )}
                {studio.email && (
                  <div>
                    <span className="text-gray-500">이메일: </span>
                    <a 
                      href={`mailto:${studio.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {studio.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

StudioDetailPage.displayName = 'StudioDetailPage';
