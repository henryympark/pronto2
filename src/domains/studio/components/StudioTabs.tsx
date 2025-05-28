/**
 * StudioTabs Component
 * 스튜디오 상세 정보를 탭으로 구성하여 표시
 */

"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone, Mail, Globe, Users, Music, Camera, Star } from 'lucide-react';
import { formatOperatingHours, getServiceCategoryLabel, getAmenityIcon } from '../services/studioUtils';
import type { Studio, StudioService } from '../types';
import { Review } from '@/types';
import { useSupabase } from '@/contexts/SupabaseContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';

interface StudioTabsProps {
  studio: Studio;
  services?: StudioService[];
}

type TabType = 'overview' | 'services' | 'amenities' | 'location' | 'reviews';

export const StudioTabs = React.memo(({ studio, services = [] }: StudioTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const supabase = useSupabase();

  // 리뷰 갯수만 가져오기 (최초 로딩용)
  const fetchReviewCount = async () => {
    try {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', studio.id)
        .eq('is_hidden', false)
        .is('deleted_at', null);

      if (error) {
        console.error('리뷰 갯수 조회 오류:', error);
        return;
      }

      setReviewCount(count || 0);
    } catch (error) {
      console.error('리뷰 갯수 조회 오류:', error);
    }
  };

  // 리뷰 데이터 가져오기 (상세 정보 포함)
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      
      // 먼저 리뷰와 이미지 조회 (customer는 수동 조인)
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          *,
          images:review_images(id, image_url)
        `)
        .eq('service_id', studio.id)
        .eq('is_hidden', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('리뷰 조회 오류:', error);
        return;
      }

      // 고객 정보 별도 조회
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, nickname, email');

      if (customersError) {
        console.error('고객 조회 오류:', customersError);
        return;
      }

      // 수동으로 고객 정보 조인
      const reviewsWithCustomers = (reviewsData || []).map((review: any) => {
        const customer = (customersData || []).find((c: any) => c.id === review.customer_id);
        return {
          ...review,
          customer: customer ? {
            id: customer.id,
            nickname: customer.nickname,
            email: customer.email
          } : {
            id: review.customer_id,
            nickname: '알 수 없는 사용자',
            email: ''
          }
        };
      });

      setReviews(reviewsWithCustomers);
      // 실제 리뷰 데이터를 가져왔을 때 갯수도 업데이트
      setReviewCount(reviewsWithCustomers.length);
    } catch (error) {
      console.error('리뷰 조회 오류:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 리뷰 갯수 먼저 가져오기
  useEffect(() => {
    fetchReviewCount();
  }, [studio.id]);

  // 리뷰 탭이 활성화될 때 리뷰 데이터 가져오기
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab, studio.id]);

  const tabs = [
    { id: 'overview', label: '개요', icon: null },
    { id: 'services', label: '서비스', icon: Music },
    { id: 'amenities', label: '편의시설', icon: Users },
    { id: 'location', label: '위치/교통', icon: MapPin },
    { id: 'reviews', label: `리뷰 (${reviewCount})`, icon: null },
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

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const renderReviews = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">이용 후기</h3>
        {reviews.length > 0 && (
          <div className="text-sm text-gray-500">
            총 {reviews.length}개의 리뷰
          </div>
        )}
      </div>
      
      {reviewsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">리뷰를 불러오는 중...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>아직 작성된 리뷰가 없습니다.</p>
          <p className="text-sm mt-1">첫 번째 리뷰를 남겨보세요!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
              {/* 리뷰 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {review.customer?.nickname?.substring(0, 1) || "익명"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{review.customer?.nickname || "익명"}</div>
                    <div className="flex items-center space-x-2">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(review.created_at), "yyyy.MM.dd", { locale: ko })}
                </div>
              </div>
              
              {/* 리뷰 내용 */}
              <div className="mb-3">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {review.content}
                </p>
              </div>
              
              {/* 리뷰 이미지 */}
              {review.images && review.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {review.images.slice(0, 6).map((image, index) => (
                    <div key={image.id} className="relative aspect-square">
                      <Image
                        src={image.image_url}
                        alt={`리뷰 이미지 ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  ))}
                  {review.images.length > 6 && (
                    <div className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        +{review.images.length - 6}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
