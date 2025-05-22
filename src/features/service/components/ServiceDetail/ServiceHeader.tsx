"use client";

import { MapPin, Star } from "lucide-react";
import { Service } from "@/types/services";

interface ServiceHeaderProps {
  service: Service;
}

export default function ServiceHeader({ service }: ServiceHeaderProps) {
  // 서비스 금액 계산 및 포맷팅 함수
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-pronto-gray-200">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">{service.name}</h1>
      {service.location && (
        <div className="flex items-center text-pronto-gray-500 mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{service.location}</span>
        </div>
      )}
      <div className="flex items-center mb-4">
        <Star className="h-4 w-4 text-yellow-400 mr-1" />
        <span className="font-medium mr-2">{service.average_rating.toFixed(1)}</span>
        <span className="text-pronto-gray-500">(리뷰 {service.review_count}개)</span>
      </div>
      <div className="mb-4">
        <span className="font-bold text-xl">{formatPrice(service.price_per_hour)}원</span>
        <span className="text-pronto-gray-500 ml-2">/ 시간</span>
      </div>
      {service.description && (
        <p className="text-pronto-gray-600">
          {service.description}
        </p>
      )}
    </div>
  );
} 