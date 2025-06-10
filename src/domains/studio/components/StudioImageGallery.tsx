/**
 * 개선된 StudioImageGallery - 전체 너비 캐러셀
 * src/domains/studio/components/StudioImageGallery.tsx
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 기본 플레이스홀더 이미지 URL
  const getPlaceholderImage = (width: number = 600) => 
    `https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=${width}&h=${Math.floor(width * 0.6)}&fit=crop&crop=center`;

  const images = React.useMemo(() => {
    if (!studio.images || studio.images.length === 0) {
      // 데모용 여러 이미지
      return [
        getPlaceholderImage(800),
        getPlaceholderImage(801),
        getPlaceholderImage(802),
        getPlaceholderImage(803),
        getPlaceholderImage(804),
      ];
    }
    
    return studio.images
      .slice(0, maxImages)
      .map(imageId => {
        const imageUrl = getStudioImageUrl(studio.id, imageId, 'large');
        return failedImages.has(imageUrl) ? getPlaceholderImage(1200) : imageUrl;
      });
  }, [studio.id, studio.images, maxImages, failedImages]);

  // 스크롤 위치로 이동
  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const itemWidth = container.offsetWidth;
      container.scrollTo({
        left: itemWidth * index,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  // 이전/다음 버튼
  const handlePrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(images.length - 1, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  // 스크롤 이벤트로 현재 인덱스 업데이트
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollPosition = container.scrollLeft;
      const itemWidth = container.offsetWidth;
      const newIndex = Math.round(scrollPosition / itemWidth);
      setCurrentIndex(newIndex);
    }
  };

  // 마우스 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current!.offsetLeft);
    setScrollLeft(scrollContainerRef.current!.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current!.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 터치 이벤트 (모바일)
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].pageX - scrollContainerRef.current!.offsetLeft);
    setScrollLeft(scrollContainerRef.current!.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const x = e.touches[0].pageX - scrollContainerRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current!.scrollLeft = scrollLeft - walk;
  };

  if (images.length === 0) return null;

  return (
    <>
      {/* 메인 캐러셀 - 500px 너비에 맞춤 */}
      <div className="relative bg-gray-900">
        {/* 스크롤 컨테이너 */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="w-full flex-shrink-0 snap-center"
            >
              <div className="relative aspect-video md:aspect-[16/10]">
                <img
                  src={image}
                  alt={`${studio.name} - 이미지 ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('unsplash.com')) {
                      setFailedImages(prev => new Set(prev).add(target.src));
                      target.src = getPlaceholderImage(800);
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
          
        {/* 좌우 네비게이션 버튼 */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all ${
                currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={currentIndex === 0}
              aria-label="이전 이미지"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={handleNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all ${
                currentIndex === images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={currentIndex === images.length - 1}
              aria-label="다음 이미지"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
              
        {/* 인디케이터 */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`transition-all ${
                  index === currentIndex 
                    ? 'w-8 h-2 bg-white' 
                    : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                } rounded-full`}
                aria-label={`이미지 ${index + 1}번으로 이동`}
              />
            ))}
          </div>
        )}

        {/* 확대 버튼 */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          aria-label="이미지 확대"
        >
          <Expand className="h-5 w-5" />
        </button>

        {/* 이미지 카운터 */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
        
      {/* 썸네일 리스트 (옵션) */}
      {images.length > 3 && (
        <div className="w-full bg-gray-100 py-4">
          <div className="max-w-[500px] mx-auto px-4">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-blue-500 shadow-lg scale-105' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`썸네일 ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('unsplash.com')) {
                        target.src = getPlaceholderImage(200);
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors z-10"
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={images[currentIndex]}
              alt={`${studio.name} - 이미지 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* 모달 네비게이션 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 p-3 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                <button
                  onClick={handleNext}
                  className="absolute right-4 p-3 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  disabled={currentIndex === images.length - 1}
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
