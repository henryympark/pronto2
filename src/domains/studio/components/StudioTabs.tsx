/**
 * StudioTabs Component
 * 스튜디오 상세 정보를 탭으로 구성하여 표시
 */

"use client";

import React, { useState } from 'react';
import { MapPin, Clock, Phone, Mail, Globe, Users, Music, Camera } from 'lucide-react';
import { formatOperatingHours, getServiceCategoryLabel, getAmenityIcon } from '../services/studioUtils';
import type { Studio, StudioService } from '../types';

interface StudioTabsProps {
  studio: Studio;
  services?: StudioService[];
}

type TabType = 'overview' | 'services' | 'amenities' | 'location' | 'reviews';

export const StudioTabs = React.memo(({ studio, services = [] }: StudioTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview', label: '개요', icon: null },
    { id: 'services', label: '서비스', icon: Music },
    { id: 'amenities', label: '편의시설', icon: Users },
    { id: 'location', label: '위치/교통', icon: MapPin },
    { id: 'reviews', label: '리뷰', icon: null },
  ] as const;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">스튜디오 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <div>
                <span className="font-medium">운영시간</span>
                <p className="text-sm text-gray-600">
                  {formatOperatingHours(studio.operatingHours)}
                </p>
              </div>
            </div>
            
            {studio.phone && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <span className="font-medium">연락처</span>
                  <p className="text-sm text-gray-600">{studio.phone}</p>
                </div>
              </div>
            )}
            
            {studio.email && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <span className="font-medium">이메일</span>
                  <p className="text-sm text-gray-600">{studio.email}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {studio.website && (
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <span className="font-medium">웹사이트</span>
                  <a 
                    href={studio.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    {studio.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 상세 설명 */}
      {studio.description && (
        <div>
          <h3 className="text-lg font-semibold mb-3">상세 설명</h3>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {studio.description}
          </p>
        </div>
      )}
    </div>
  );

  const renderServices = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">제공 서비스</h3>
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div key={service.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{service.name}</h4>
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {getServiceCategoryLabel(service.category)}
                </span>
              </div>
              
              {service.description && (
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {service.duration}분 • 최대 {service.maxParticipants || '제한없음'}명
                </span>
                <span className="font-semibold">
                  {service.price.toLocaleString()}원
                </span>
              </div>
              
              {service.equipment && service.equipment.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500">포함 장비: </span>
                  <span className="text-xs text-gray-600">
                    {service.equipment.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">등록된 서비스가 없습니다.</p>
      )}
    </div>
  );

  const renderAmenities = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">편의시설</h3>
      {studio.amenities.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {studio.amenities.map((amenity) => (
            <div 
              key={amenity} 
              className="flex items-center p-3 bg-gray-50 rounded-lg"
            >
              <span className="mr-2">{getAmenityIcon(amenity)}</span>
              <span className="text-sm">{amenity}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">등록된 편의시설이 없습니다.</p>
      )}
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">위치 정보</h3>
      <div className="space-y-3">
        <div>
          <span className="font-medium">주소</span>
          <p className="text-gray-600">{studio.address}</p>
          <p className="text-gray-500 text-sm">{studio.region} {studio.district}</p>
        </div>
        
        {/* 지도 영역 (추후 구현) */}
        <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2" />
            <p>지도 영역</p>
            <p className="text-sm">(카카오맵 또는 네이버맵 연동 예정)</p>
          </div>
        </div>
        
        {/* 교통 정보 */}
        <div>
          <span className="font-medium">교통 안내</span>
          <p className="text-gray-600 text-sm mt-1">
            대중교통 이용 시 정확한 위치는 예약 확정 후 안내드립니다.
          </p>
        </div>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">이용 후기</h3>
      <div className="text-center py-8 text-gray-500">
        <p>리뷰 시스템은 추후 구현 예정입니다.</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'services': return renderServices();
      case 'amenities': return renderAmenities();
      case 'location': return renderLocation();
      case 'reviews': return renderReviews();
      default: return renderOverview();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 탭 헤더 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {Icon && <Icon className="h-4 w-4 mr-2" />}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
});

StudioTabs.displayName = 'StudioTabs';
