"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServiceData } from "./hooks/useServiceData";
import { ServiceList } from "./components/ServiceList";
import { ServiceInfoTab } from "./components/tabs/ServiceInfoTab";
import { ServiceHolidaysTab } from "./components/tabs/ServiceHolidaysTab";
import { ServiceOperatingHoursTab } from "./components/tabs/ServiceOperatingHoursTab";

export default function AdminServicesPage() {
  const {
    loading,
    error,
    services,
    selectedService,
    handleServiceChange,
    refreshServices
  } = useServiceData();
  
  // 로딩 상태
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">서비스 정보 관리</h1>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  // 에러 상태
  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">서비스 정보 관리</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm mt-2">
            services 테이블이 아직 생성되지 않았을 수 있습니다.
          </p>
        </div>
      </div>
    );
  }
  
  // 서비스 없음 상태
  if (services.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">서비스 정보 관리</h1>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">등록된 서비스가 없습니다.</p>
        </div>
      </div>
    );
  }
  
  // 메인 렌더링
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">서비스 정보 관리</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 서비스 목록 */}
        <ServiceList
          services={services}
          selectedService={selectedService}
          onServiceChange={handleServiceChange}
        />
        
        {/* 서비스 관리 탭 */}
        {selectedService && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">{selectedService.name} 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info">
                <TabsList className="mb-4">
                  <TabsTrigger value="info">서비스 정보</TabsTrigger>
                  <TabsTrigger value="holidays">휴무일 설정</TabsTrigger>
                  <TabsTrigger value="operating-hours">예약 가능 시간 설정</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info">
                  <ServiceInfoTab
                    selectedService={selectedService}
                    onServiceUpdate={refreshServices}
                  />
                </TabsContent>
                
                <TabsContent value="holidays">
                  <ServiceHolidaysTab serviceId={selectedService.id} />
                </TabsContent>
                
                <TabsContent value="operating-hours">
                  <ServiceOperatingHoursTab serviceId={selectedService.id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 