"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Service } from "@/types/services";
import { DEFAULT_SERVICE_INFO } from "@/data/serviceInfo";
import { getServiceFaq, FaqItem } from "@/data/faqData";
import { useServiceDetailStore } from "../../stores/serviceDetailStore";
import { Star } from "lucide-react";

interface ServiceTabsProps {
  service: Service;
}

export default function ServiceTabs({ service }: ServiceTabsProps) {
  const { activeTab, setActiveTab } = useServiceDetailStore();
  
  // FAQ 데이터 로드
  const faqItems = getServiceFaq(service.id);
  
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={setActiveTab}
      className="w-full"
    >
      <TabsList className="w-full overflow-x-auto flex whitespace-nowrap">
        <TabsTrigger value="facility">시설 안내</TabsTrigger>
        <TabsTrigger value="map">지도</TabsTrigger>
        <TabsTrigger value="parking">주차</TabsTrigger>
        <TabsTrigger value="notice">유의사항</TabsTrigger>
        <TabsTrigger value="refund">환불 정책</TabsTrigger>
        <TabsTrigger value="qna">Q&A</TabsTrigger>
        <TabsTrigger value="reviews">리뷰</TabsTrigger>
      </TabsList>
      
      <TabsContent value="facility" className="card-container mt-2">
        <h3 className="font-semibold text-lg mb-2">시설 안내</h3>
        <p className="text-pronto-gray-600">
          스튜디오 면적: {DEFAULT_SERVICE_INFO.facilityInfo.area}<br />
          천장 높이: {DEFAULT_SERVICE_INFO.facilityInfo.ceilingHeight}<br />
          제공 장비: {DEFAULT_SERVICE_INFO.facilityInfo.equipment}<br />
          편의시설: {DEFAULT_SERVICE_INFO.facilityInfo.amenities}
        </p>
      </TabsContent>
      
      <TabsContent value="map" className="card-container mt-2">
        <div className="h-64 bg-pronto-gray-100 rounded-lg flex items-center justify-center">
          지도 영역 (추후 구현)
        </div>
      </TabsContent>
      
      <TabsContent value="notice" className="card-container mt-2">
        <h3 className="font-semibold text-lg mb-2">유의사항</h3>
        {service.notice ? (
          <p className="text-pronto-gray-600 whitespace-pre-line">
            {service.notice}
          </p>
        ) : (
          <p className="text-pronto-gray-600">
            {DEFAULT_SERVICE_INFO.notice.map((item, index) => (
              <span key={index}>
                - {item}<br />
              </span>
            ))}
          </p>
        )}
      </TabsContent>
      
      <TabsContent value="refund" className="card-container mt-2">
        <h3 className="font-semibold text-lg mb-2">환불 정책</h3>
        {service.refund_policy ? (
          <p className="text-pronto-gray-600 whitespace-pre-line">
            {service.refund_policy}
          </p>
        ) : (
          <p className="text-pronto-gray-600">
            {DEFAULT_SERVICE_INFO.refundPolicy.map((item, index) => (
              <span key={index}>
                - {item}<br />
              </span>
            ))}
          </p>
        )}
      </TabsContent>
      
      <TabsContent value="parking" className="card-container mt-2">
        <h3 className="font-semibold text-lg mb-2">주차 안내</h3>
        <p className="text-pronto-gray-600">
          {DEFAULT_SERVICE_INFO.parkingInfo}
        </p>
      </TabsContent>
      
      <TabsContent value="qna" className="card-container mt-2">
        <h3 className="font-semibold text-lg mb-2">자주 묻는 질문</h3>
        <div className="space-y-3">
          {faqItems.map((faq: FaqItem, index: number) => (
            <div key={index}>
              <p className="font-medium">Q: {faq.question}</p>
              <p className="text-pronto-gray-600">A: {faq.answer}</p>
            </div>
          ))}
        </div>
      </TabsContent>
      
      <TabsContent value="reviews" className="card-container mt-2">
        <h3 className="font-semibold text-lg mb-2">리뷰</h3>
        {service.review_count > 0 ? (
          <div className="flex items-center mb-4">
            <Star className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="font-medium mr-2">{service.average_rating.toFixed(1)}</span>
            <span className="text-pronto-gray-500">(리뷰 {service.review_count}개)</span>
          </div>
        ) : (
          <p className="text-pronto-gray-600">
            아직 리뷰가 없습니다.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
} 