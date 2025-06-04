'use client';

import { Calendar, Camera, Star } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: "간편한 예약",
    description: "원하는 날짜와 시간을 클릭 몇 번으로 손쉽게 예약할 수 있습니다."
  },
  {
    icon: Camera,
    title: "최고의 장비",
    description: "전문 촬영을 위한 최신 장비와 시설이 모두 갖추어져 있습니다."
  },
  {
    icon: Star,
    title: "적립 혜택",
    description: "리뷰 작성 시 적립 시간을 드려 다음 이용 시 할인 혜택을 제공합니다."
  }
];

export function FeaturesSection() {
  return (
    <section className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">프론토 서비스의 특징</h2>
        <p className="text-gray-600">
          쉽고 빠른 예약 시스템과 최고의 스튜디오 환경을 경험하세요
        </p>
      </div>

      <div className="space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="p-6 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">{feature.title}</h3>
            </div>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
} 