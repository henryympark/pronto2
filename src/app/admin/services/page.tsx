"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DayPicker } from "react-day-picker";
import { format, isSameDay, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

// Admin 페이지에서는 서버 역할로 Supabase에 접근
import { createAdminClient } from "@/lib/supabase-admin";

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_hour: number;
  location: string;
  image_url: string;
  notice?: string;
  refund_policy?: string;
  average_rating?: number;
  review_count?: number;
};

type Holiday = {
  id: string;
  service_id: string;
  holiday_date: string;
  description: string;
};

export default function AdminServicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // 휴무일 관련 상태
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayMessage, setHolidayMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  
  // 일반 클라이언트와 어드민 클라이언트 둘 다 준비
  const supabase = useSupabase();
  const supabaseAdmin = createAdminClient();
  
  useEffect(() => {
    async function fetchServices() {
      try {
        // 서비스 목록은 일반 클라이언트로 조회 (RLS로 모든 사용자가 볼 수 있음)
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setServices(data || []);
        if (data && data.length > 0) {
          setSelectedService(data[0]);
        }
      } catch (err: any) {
        console.error('서비스 정보 로딩 오류:', err);
        setError(err.message || '서비스 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchServices();
  }, [supabase]);
  
  // 선택된 서비스 변경 시 해당 서비스의 휴무일 조회
  useEffect(() => {
    if (selectedService) {
      fetchHolidays(selectedService.id);
    }
  }, [selectedService]);

  // 휴무일 조회 함수 - 관리자 권한으로 접근
  const fetchHolidays = async (serviceId: string) => {
    setLoadingHolidays(true);
    try {
      console.log('휴무일 조회 시작:', serviceId);
      
      // 관리자 권한으로 휴무일 조회 (RLS 우회)
      const { data, error } = await supabaseAdmin
        .from('holidays')
        .select('*')
        .eq('service_id', serviceId)
        .order('holiday_date', { ascending: true });
        
      if (error) {
        console.error('Supabase 에러 정보:', JSON.stringify(error), error.code, error.message, error.details);
        throw error;
      }
      
      console.log('휴무일 조회 결과:', data);
      setHolidays(data || []);
      
      // 휴무일 날짜를 Date 객체로 변환하여 선택된 날짜로 설정
      const dates = (data || []).map(holiday => new Date(holiday.holiday_date));
      setSelectedDates(dates);
    } catch (err: any) {
      console.error('휴무일 조회 오류 세부 정보:', err, typeof err, Object.keys(err), err?.message, err?.code, err?.details);
      setHolidayMessage({
        type: 'error',
        text: err.message || `휴무일 정보를 불러오는데 실패했습니다. 자세한 오류: ${JSON.stringify(err)}`
      });
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setImagePreview(null);
      setImageFile(null);
      // 휴무일 관련 상태 초기화
      setHolidayDescription("");
      setHolidayMessage(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedService) return;
    
    const { name, value } = e.target;
    let parsedValue: any = value;
    
    // price_per_hour는 숫자로 변환
    if (name === 'price_per_hour') {
      parsedValue = parseInt(value) || 0;
    }
    
    setSelectedService({
      ...selectedService,
      [name]: parsedValue
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    
    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    
    setSaving(true);
    setSaveMessage(null);
    
    try {
      let imageUrl = selectedService.image_url;
      
      // 이미지 파일이 있으면 업로드
      if (imageFile) {
        const fileName = `service-${selectedService.slug}-${Date.now()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('services')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) {
          throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
        }
        
        // 업로드된 이미지의 공개 URL 가져오기
        const { data: publicUrlData } = supabase.storage
          .from('services')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrlData.publicUrl;
      }
      
      // 서비스 정보 업데이트
      const { error: updateError } = await supabase
        .from('services')
        .update({
          name: selectedService.name,
          description: selectedService.description,
          price_per_hour: selectedService.price_per_hour,
          location: selectedService.location,
          image_url: imageUrl,
          notice: selectedService.notice,
          refund_policy: selectedService.refund_policy
        })
        .eq('id', selectedService.id);
        
      if (updateError) {
        throw new Error(`서비스 정보 업데이트 실패: ${updateError.message}`);
      }
      
      // 성공 메시지 표시
      setSaveMessage({
        type: 'success',
        text: '서비스 정보가 성공적으로 저장되었습니다.'
      });
      
      // 서비스 목록 갱신
      const { data: updatedServices, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!fetchError && updatedServices) {
        setServices(updatedServices);
        const updatedService = updatedServices.find(s => s.id === selectedService.id);
        if (updatedService) {
          setSelectedService(updatedService);
        }
      }
    } catch (err: any) {
      console.error('서비스 정보 저장 오류:', err);
      setSaveMessage({
        type: 'error',
        text: err.message || '서비스 정보 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // 휴무일 추가 - 관리자 권한으로 접근
  const handleAddHoliday = async () => {
    if (!selectedService || !selectedDates.length) return;
    
    setSavingHoliday(true);
    setHolidayMessage(null);
    
    try {
      // 기존 휴무일과 비교하여 새로 추가할 날짜만 필터링
      const existingDates = holidays.map(h => h.holiday_date);
      const newDates = selectedDates.filter(date => 
        !existingDates.includes(format(date, 'yyyy-MM-dd'))
      );
      
      if (newDates.length === 0) {
        setHolidayMessage({
          type: 'info',
          text: '추가할 새 휴무일이 없습니다.'
        });
        setSavingHoliday(false);
        return;
      }
      
      // 새 휴무일 추가 (관리자 권한으로)
      const holidaysToAdd = newDates.map(date => ({
        service_id: selectedService.id,
        holiday_date: format(date, 'yyyy-MM-dd'),
        description: holidayDescription || '휴무일'
      }));
      
      const { data, error } = await supabaseAdmin
        .from('holidays')
        .insert(holidaysToAdd)
        .select();
        
      if (error) {
        throw error;
      }
      
      // 휴무일 목록 갱신
      await fetchHolidays(selectedService.id);
      
      setHolidayMessage({
        type: 'success',
        text: `휴무일이 성공적으로 등록되었습니다. (${newDates.length}일)`
      });
      
      // 설명 초기화
      setHolidayDescription("");
    } catch (err: any) {
      console.error('휴무일 등록 오류:', err);
      setHolidayMessage({
        type: 'error',
        text: err.message || '휴무일 등록 중 오류가 발생했습니다.'
      });
    } finally {
      setSavingHoliday(false);
    }
  };
  
  // 휴무일 삭제 - 관리자 권한으로 접근
  const handleDeleteHoliday = async (holidayDate: string) => {
    if (!selectedService) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('holidays')
        .delete()
        .eq('service_id', selectedService.id)
        .eq('holiday_date', holidayDate);
        
      if (error) {
        throw error;
      }
      
      // 휴무일 목록 갱신
      await fetchHolidays(selectedService.id);
      
      // 성공 메시지
      setHolidayMessage({
        type: 'success',
        text: '휴무일이 삭제되었습니다.'
      });
    } catch (err: any) {
      console.error('휴무일 삭제 오류:', err);
      setHolidayMessage({
        type: 'error',
        text: err.message || '휴무일 삭제 중 오류가 발생했습니다.'
      });
    }
  };
  
  // 캘린더에 휴무일 표시를 위한 스타일
  const holidayStyle = (date: Date) => {
    const isHoliday = holidays.some(holiday => 
      holiday.holiday_date === format(date, 'yyyy-MM-dd')
    );
    
    if (isHoliday) {
      return {
        backgroundColor: '#FEE2E2',
        color: '#EF4444',
        fontWeight: 'bold'
      };
    }
    return {};
  };
  
  // 캘린더에서 날짜 선택 처리
  const handleDateSelect = (date: Date) => {
    setSelectedDates(current => {
      // 이미 선택된 날짜면 제거
      const isSelected = current.some(d => isSameDay(d, date));
      if (isSelected) {
        return current.filter(d => !isSameDay(d, date));
      }
      // 아니면 추가
      return [...current, date];
    });
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">서비스 정보 관리</h1>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm mt-2">
            services 테이블이 아직 생성되지 않았을 수 있습니다.
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">등록된 서비스가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">서비스 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    className={`w-full px-4 py-2 text-left rounded-md transition-colors ${
                      selectedService?.id === service.id
                        ? 'bg-pronto-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleServiceChange(service.id)}
                  >
                    {service.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
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
                  </TabsList>
                  
                  <TabsContent value="info">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {saveMessage && (
                        <div className={`p-3 rounded-md ${
                          saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {saveMessage.text}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">서비스 이름</Label>
                          <Input
                            id="name"
                            name="name"
                            value={selectedService.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="price_per_hour">시간당 가격 (원)</Label>
                          <Input
                            id="price_per_hour"
                            name="price_per_hour"
                            type="number"
                            value={selectedService.price_per_hour}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="description">서비스 설명</Label>
                          <Textarea
                            id="description"
                            name="description"
                            value={selectedService.description}
                            onChange={handleInputChange}
                            rows={4}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="location">위치</Label>
                          <Input
                            id="location"
                            name="location"
                            value={selectedService.location}
                            onChange={handleInputChange}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="notice">주의사항</Label>
                          <Textarea
                            id="notice"
                            name="notice"
                            value={selectedService.notice || ''}
                            onChange={handleInputChange}
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="refund_policy">환불 정책</Label>
                          <Textarea
                            id="refund_policy"
                            name="refund_policy"
                            value={selectedService.refund_policy || ''}
                            onChange={handleInputChange}
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="image">서비스 이미지</Label>
                          <div className="mt-2">
                            {(imagePreview || selectedService.image_url) && (
                              <div className="mb-4">
                                <img
                                  src={imagePreview || selectedService.image_url}
                                  alt={selectedService.name}
                                  className="w-full max-w-md h-auto rounded-md"
                                />
                              </div>
                            )}
                            <Input
                              id="image"
                              name="image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={saving}
                          className="px-6"
                        >
                          {saving ? (
                            <>
                              <span className="mr-2">저장 중...</span>
                              <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div>
                            </>
                          ) : '변경사항 저장'}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="holidays">
                    <div className="space-y-6">
                      {holidayMessage && (
                        <Alert 
                          className={`${
                            holidayMessage.type === 'success' ? 'bg-green-100 text-green-800' : 
                            holidayMessage.type === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <AlertDescription>{holidayMessage.text}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="font-medium">휴무일 설정</div>
                          <p className="text-sm text-gray-500">
                            캘린더에서 휴무일로 지정할 날짜를 선택해주세요. 이미 등록된 휴무일은 빨간색으로 표시됩니다.
                            여러 날짜를 한 번에 선택할 수 있습니다.
                          </p>
                          <div className="p-4 border rounded-md bg-white">
                            <DayPicker
                              mode="multiple"
                              selected={selectedDates}
                              onDayClick={handleDateSelect}
                              modifiers={{
                                holidays: holidays.map(h => new Date(h.holiday_date))
                              }}
                              modifiersStyles={{
                                holidays: {
                                  backgroundColor: '#FEE2E2',
                                  color: '#EF4444',
                                  fontWeight: 'bold'
                                }
                              }}
                              locale={ko}
                              fromDate={new Date()}
                              styles={{
                                caption: {
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  marginBottom: '1rem',
                                }
                              }}
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="holiday-description">휴무일 설명 (선택사항)</Label>
                            <Input
                              id="holiday-description"
                              value={holidayDescription}
                              onChange={(e) => setHolidayDescription(e.target.value)}
                              placeholder="예: 정기 휴무일, 공휴일, 시설 점검 등"
                            />
                            
                            <Button
                              onClick={handleAddHoliday}
                              disabled={savingHoliday || selectedDates.length === 0}
                              className="w-full"
                            >
                              {savingHoliday ? (
                                <>
                                  <span className="mr-2">저장 중...</span>
                                  <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div>
                                </>
                              ) : '휴무일 등록하기'}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="font-medium">등록된 휴무일 목록</div>
                          {loadingHolidays ? (
                            <div className="flex justify-center p-4">
                              <div className="w-6 h-6 border-2 border-t-pronto-primary rounded-full animate-spin"></div>
                            </div>
                          ) : holidays.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                              <p className="text-gray-500">등록된 휴무일이 없습니다.</p>
                            </div>
                          ) : (
                            <div className="max-h-[400px] overflow-y-auto border rounded-md">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {holidays.map((holiday) => {
                                    const date = new Date(holiday.holiday_date);
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    const isPast = date < new Date(new Date().toDateString());
                                    
                                    return (
                                      <tr 
                                        key={holiday.id || holiday.holiday_date}
                                        className={`
                                          ${isToday ? 'bg-blue-50' : ''} 
                                          ${isPast ? 'text-gray-400' : ''}
                                        `}
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          {format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                                          {isToday && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">오늘</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{holiday.description || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <Button
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => handleDeleteHoliday(holiday.holiday_date)}
                                            title="휴무일 삭제"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <X size={16} />
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
} 