/**
 * StudioHeader Component
 * 스튜디오 상세 페이지 헤더 정보 표시
 */

"use client";

import React from 'react';
import { MapPin, Star, Clock, Users } from "lucide-react";
import { formatPriceRange, formatRating, formatOperatingHours } from '../services/studioUtils';
import type { Studio } from '../types';

interface StudioHeaderProps {
  studio: Studio;
}

export const StudioHeader = React.memo(({ studio }: StudioHeaderProps) => {
  return (
    <>
      {/* 스튜디오 이름 */}
      <h1 className="text-2xl md:text-3xl font-bold mb-2">{studio.name}</h1>
      
      {/* 위치 정보 */}
      <div className="flex items-center text-gray-500 mb-4">
        <MapPin className="h-4 w-4 mr-1" />
        <span>{studio.address}</span>
        <span className="mx-2">•</span>
        <span>{studio.region} {studio.district}</span>
      </div>
      
      {/* 평점 */}
      <div className="flex items-center mb-4">
        <Star className="h-4 w-4 text-yellow-400 mr-1 fill-current" />
        <span className="font-medium mr-2">
          {formatRating(studio.rating)}
        </span>
      </div>
      
      {/* 가격 범위 */}
      <div className="mb-4">
        <span className="font-bold text-xl">
          {formatPriceRange(studio.priceRange.min, studio.priceRange.max)}
        </span>
        <span className="text-gray-500 ml-2">/ 시간</span>
      </div>
      
      {/* 운영 시간 */}
      <div className="flex items-center mb-4 text-sm text-gray-600">
        <Clock className="h-4 w-4 mr-1" />
        <span>{formatOperatingHours(studio.operatingHours)}</span>
      </div>
      
      {/* 설명 */}
      {studio.description && (
        <p className="text-gray-600 leading-relaxed">
          {studio.description}
        </p>
      )}
      
      {/* 편의시설 */}
      {studio.amenities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="font-medium mb-2">편의시설</h3>
          <div className="flex flex-wrap gap-2">
            {studio.amenities.map((amenity) => (
              <span
                key={amenity}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-md"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
});

StudioHeader.displayName = 'StudioHeader';
