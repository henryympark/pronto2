/**
 * StudioImageGallery Component
 * 스튜디오 이미지 갤러리
 */

"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { getStudioImageUrl } from '../services/studioUtils';
import type { Studio } from '../types';

interface StudioImageGalleryProps {
  studio: Studio;
  maxImages?: number;
}

export const StudioImageGallery = React.memo(({ 
  studio, 
  maxImages = 8 
}: StudioImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // 기본 플레이스홀더 이미지 URL
  const getPlaceholderImage = (width: number = 600) => 
    `https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=${width}&h=${Math.floor(width * 0.6)}&fit=crop&crop=center`;

  const images = useMemo(() => {
    if (!studio.images || studio.images.length === 0) {
      // 기본 플레이스홀더 이미지 사용
      return [getPlaceholderImage(600)];
    }
    
    return studio.images
      .slice(0, maxImages)
      .map(imageId => {
        const imageUrl = getStudioImageUrl(studio.id, imageId, 'large');
        // 실패한 이미지는 플레이스홀더로 대체
        return failedImages.has(imageUrl) ? getPlaceholderImage(1200) : imageUrl;
      });
  }, [studio.id, studio.images, maxImages, failedImages]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) return null;

  return (
    <>
      {/* 메인 갤러리 */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        {/* 메인 이미지 */}
        <div className="relative aspect-video md:aspect-[16/10]">
          <img
            src={images[currentIndex]}
            alt={`${studio.name} - 이미지 ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const originalSrc = target.src;
              
              // 이미 플레이스홀더 이미지인 경우 추가 처리 방지
              if (originalSrc.includes('unsplash.com')) {
                return;
              }
              
              // 실패한 이미지를 Set에 추가하고 플레이스홀더로 대체
              setFailedImages(prev => new Set(prev).add(originalSrc));
              target.src = getPlaceholderImage(600);
            }}
          />
          
          {/* 확대 버튼 */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            aria-label="이미지 확대"
          >
            <Expand className="h-4 w-4" />
          </button>
          
          {/* 이미지 네비게이션 (2개 이상일 때만) */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                aria-label="다음 이미지"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              {/* 이미지 인디케이터 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                    aria-label={`이미지 ${index + 1}번으로 이동`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 썸네일 (4개 이상일 때만) */}
        {images.length > 3 && (
          <div className="p-4">
            <div className="flex space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                    index === currentIndex ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={(() => {
                      const thumbnailUrl = getStudioImageUrl(studio.id, studio.images?.[index], 'thumbnail');
                      return failedImages.has(thumbnailUrl) ? getPlaceholderImage(300) : thumbnailUrl;
                    })()}
                    alt={`썸네일 ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const originalSrc = target.src;
                      
                      if (originalSrc.includes('unsplash.com')) {
                        return;
                      }
                      
                      setFailedImages(prev => new Set(prev).add(originalSrc));
                      target.src = getPlaceholderImage(300);
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 이미지 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-7xl max-h-full">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors z-10"
              aria-label="모달 닫기"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* 모달 이미지 */}
            <img
              src={images[currentIndex]}
              alt={`${studio.name} - 이미지 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const originalSrc = target.src;
                
                if (originalSrc.includes('unsplash.com')) {
                  return;
                }
                
                setFailedImages(prev => new Set(prev).add(originalSrc));
                target.src = getPlaceholderImage(1200);
              }}
            />
            
            {/* 모달 네비게이션 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
});

StudioImageGallery.displayName = 'StudioImageGallery';
