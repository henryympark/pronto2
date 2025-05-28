"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
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
  description?: string;
  created_at: string;
  updated_at: string;
};

type OperatingHours = {
  id?: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

export default function AdminServicesPage() {
  const [loading, setLoading] = useState(false);
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
  
  // 운영시간 관련 상태
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>([]);
  const [loadingOperatingHours, setLoadingOperatingHours] = useState(false);
  const [savingOperatingHours, setSavingOperatingHours] = useState(false);
  const [operatingHoursMessage, setOperatingHoursMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  
  // 일반 클라이언트와 어드민 클라이언트 둘 다 준비
  const supabase = useSupabase();
  const supabaseAdmin = createAdminClient();
  
  // 요일 라벨
  const dayLabels = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  
  // 30분 단위 시간 옵션 생성 함수
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push({
          value: timeString,
          label: timeString
        });
      }
    }
    return options;
  };
  
  const timeOptions = generateTimeOptions();
  
  // 컴포넌트 마운트 시 즉시 데이터 로딩
  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
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
  
  // 선택된 서비스 변경 시 해당 서비스의 휴무일과 운영시간 조회
  useEffect(() => {
    if (selectedService) {
      fetchHolidays(selectedService.id);
      fetchOperatingHours(selectedService.id);
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

  // 운영시간 조회 함수 - 관리자 권한으로 접근
  const fetchOperatingHours = async (serviceId: string) => {
    setLoadingOperatingHours(true);
    try {
      console.log('운영시간 조회 시작:', serviceId);
      
      // 관리자 권한으로 운영시간 조회 (RLS 우회)
      const { data, error } = await supabaseAdmin
        .from('service_operating_hours')
        .select('*')
        .eq('service_id', serviceId)
        .order('day_of_week', { ascending: true });
        
      if (error) {
        console.error('운영시간 조회 에러:', error);
        throw error;
      }
      
      console.log('운영시간 조회 결과:', data);
      
      // 7일치 데이터가 없으면 기본값으로 초기화
      const defaultOperatingHours: OperatingHours[] = [];
      for (let day = 0; day < 7; day++) {
        const existingHour = data?.find(h => h.day_of_week === day);
        if (existingHour) {
          // 데이터베이스에서 가져온 시간 형식을 HH:MM으로 변환
          defaultOperatingHours.push({
            ...existingHour,
            start_time: existingHour.start_time.substring(0, 5), // HH:MM:SS -> HH:MM
            end_time: existingHour.end_time.substring(0, 5)       // HH:MM:SS -> HH:MM
          });
        } else {
          // 기본값: 06:00-23:30, 일요일은 휴무
          if (day === 0) {
            // 일요일 휴무일 - 시간은 빈 값으로 설정
            defaultOperatingHours.push({
              service_id: serviceId,
              day_of_week: day,
              start_time: '00:00',
              end_time: '00:00',
              is_closed: true
            });
          } else {
            // 평일 운영시간
            defaultOperatingHours.push({
              service_id: serviceId,
              day_of_week: day,
              start_time: '06:00',
              end_time: '23:30',
              is_closed: false
            });
          }
        }
      }
      
      setOperatingHours(defaultOperatingHours);
    } catch (err: any) {
      console.error('운영시간 조회 오류:', err);
      setOperatingHoursMessage({
        type: 'error',
        text: err.message || '운영시간 정보를 불러오는데 실패했습니다.'
      });
    } finally {
      setLoadingOperatingHours(false);
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
      // 운영시간 관련 상태 초기화
      setOperatingHoursMessage(null);
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
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      let imageUrl = selectedService.image_url;
      
      // 이미지 업로드 처리
      if (imageFile) {
        const fileName = `${selectedService.id}-${Date.now()}.${imageFile.name.split('.').pop()}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('services')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('services')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // 서비스 정보 업데이트
      const { error: updateError } = await supabase
        .from('services')
        .update({
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          price_per_hour: parseInt(formData.get('price_per_hour') as string),
          location: formData.get('location') as string,
          image_url: imageUrl,
          notice: formData.get('notice') as string,
          refund_policy: formData.get('refund_policy') as string,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedService.id);

      if (updateError) {
        throw updateError;
      }

      setSaveMessage({
        type: 'success',
        text: '서비스 정보가 성공적으로 저장되었습니다.'
      });

      // 서비스 목록 새로고침
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

  // 운영시간 업데이트 함수
  const handleOperatingHourChange = (dayOfWeek: number, field: 'start_time' | 'end_time' | 'is_closed', value: string | boolean) => {
    setOperatingHours(prev => 
      prev.map(hour => {
        if (hour.day_of_week === dayOfWeek) {
          if (field === 'is_closed' && value === true) {
            // 휴무일로 설정할 때 시간을 00:00으로 설정
            return { 
              ...hour, 
              [field]: value,
              start_time: '00:00',
              end_time: '00:00'
            };
          } else if (field === 'is_closed' && value === false) {
            // 휴무일 해제할 때 기본 운영시간으로 설정
            return { 
              ...hour, 
              [field]: value,
              start_time: '06:00',
              end_time: '23:30'
            };
          } else {
            return { ...hour, [field]: value };
          }
        }
        return hour;
      })
    );
  };

  // 운영시간 저장 함수
  const handleSaveOperatingHours = async () => {
    if (!selectedService) return;
    
    setSavingOperatingHours(true);
    setOperatingHoursMessage(null);
    
    try {
      // 기존 운영시간 데이터 삭제 후 새로 삽입
      const { error: deleteError } = await supabaseAdmin
        .from('service_operating_hours')
        .delete()
        .eq('service_id', selectedService.id);
        
      if (deleteError) {
        throw deleteError;
      }
      
      // 새 운영시간 데이터 삽입
      const { error: insertError } = await supabaseAdmin
        .from('service_operating_hours')
        .insert(operatingHours);
        
      if (insertError) {
        throw insertError;
      }
      
      setOperatingHoursMessage({
        type: 'success',
        text: '운영시간이 성공적으로 저장되었습니다.'
      });
      
      // 운영시간 목록 갱신
      await fetchOperatingHours(selectedService.id);
    } catch (err: any) {
      console.error('운영시간 저장 오류:', err);
      setOperatingHoursMessage({
        type: 'error',
        text: err.message || '운영시간 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setSavingOperatingHours(false);
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
  

  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">서비스 정보 관리</h1>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
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
          {/* 서비스 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">서비스 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceChange(service.id)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedService?.id === service.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm opacity-75">
                      {service.price_per_hour?.toLocaleString()}원/시간
                    </div>
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
                    <TabsTrigger value="operating-hours">예약 가능 시간 설정</TabsTrigger>
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
                          <Label htmlFor="name">서비스명</Label>
                          <Input
                            id="name"
                            name="name"
                            defaultValue={selectedService.name}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="price_per_hour">시간당 가격 (원)</Label>
                          <Input
                            id="price_per_hour"
                            name="price_per_hour"
                            type="number"
                            defaultValue={selectedService.price_per_hour}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="description">서비스 설명</Label>
                          <Textarea
                            id="description"
                            name="description"
                            defaultValue={selectedService.description || ''}
                            rows={4}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="location">위치</Label>
                          <Input
                            id="location"
                            name="location"
                            defaultValue={selectedService.location || ''}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="notice">주의사항/약관</Label>
                          <Textarea
                            id="notice"
                            name="notice"
                            defaultValue={selectedService.notice || ''}
                            rows={4}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="refund_policy">환불 정책</Label>
                          <Textarea
                            id="refund_policy"
                            name="refund_policy"
                            defaultValue={selectedService.refund_policy || ''}
                            rows={4}
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
                      
                      {/* 모바일 우선 1열 레이아웃 */}
                      <div className="space-y-8">
                        {/* 휴무일 설정 섹션 */}
                        <div className="space-y-4">
                          <div className="font-medium text-lg">휴무일 설정</div>
                          <p className="text-sm text-gray-500">
                            캘린더에서 휴무일로 지정할 날짜를 선택해주세요. 이미 등록된 휴무일은 빨간색으로 표시됩니다.
                            여러 날짜를 한 번에 선택할 수 있습니다.
                          </p>
                          
                          {/* 캘린더 */}
                          <div className="p-4 border rounded-md bg-white">
                            <div className="flex justify-center">
                              <Calendar
                                mode="multiple"
                                required={false}
                                selected={selectedDates}
                                onSelect={(dates) => setSelectedDates(dates || [])}
                                className="rounded-md"
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                modifiers={{
                                  holidays: holidays.map(h => new Date(h.holiday_date))
                                }}
                                modifiersClassNames={{
                                  holidays: "bg-red-100 text-red-600 font-bold"
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* 설명 입력 및 등록 버튼 */}
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
                        
                        {/* 등록된 휴무일 목록 섹션 */}
                        <div className="space-y-4">
                          <div className="font-medium text-lg">등록된 휴무일 목록</div>
                          {loadingHolidays ? (
                            <div className="flex justify-center p-4">
                              <div className="w-6 h-6 border-2 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                          ) : holidays.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                              <p className="text-gray-500">등록된 휴무일이 없습니다.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {holidays.map((holiday) => {
                                const date = new Date(holiday.holiday_date);
                                const isToday = new Date().toDateString() === date.toDateString();
                                const isPast = date < new Date(new Date().toDateString());
                                
                                return (
                                  <div 
                                    key={holiday.id || holiday.holiday_date}
                                    className={`
                                      p-4 border rounded-lg flex items-center justify-between
                                      ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'} 
                                      ${isPast ? 'text-gray-400 bg-gray-50' : ''}
                                    `}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">
                                          {format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                                        </span>
                                        {isToday && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                            오늘
                                          </span>
                                        )}
                                      </div>
                                      {holiday.description && (
                                        <p className="text-sm text-gray-600 truncate">
                                          {holiday.description}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDeleteHoliday(holiday.holiday_date)}
                                      title="휴무일 삭제"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                    >
                                      <X size={16} />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="operating-hours">
                    <div className="space-y-6">
                      {operatingHoursMessage && (
                        <Alert 
                          className={`${
                            operatingHoursMessage.type === 'success' ? 'bg-green-100 text-green-800' : 
                            operatingHoursMessage.type === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <AlertDescription>{operatingHoursMessage.text}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-4">
                        <div className="font-medium text-lg">예약 가능 시간 설정</div>
                        <p className="text-sm text-gray-500">
                          요일별로 예약 가능한 시간을 설정하세요. 휴무일로 설정하면 해당 요일에는 예약을 받지 않습니다.
                        </p>
                        
                        {loadingOperatingHours ? (
                          <div className="flex justify-center p-4">
                            <div className="w-6 h-6 border-2 border-t-blue-600 rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {operatingHours.map((hour) => (
                              <div key={hour.day_of_week} className="p-4 border rounded-lg bg-white">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-medium">{dayLabels[hour.day_of_week]}</div>
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor={`closed-${hour.day_of_week}`} className="text-sm">
                                      휴무일
                                    </Label>
                                    <Switch
                                      id={`closed-${hour.day_of_week}`}
                                      checked={hour.is_closed}
                                      onCheckedChange={(checked: boolean) => 
                                        handleOperatingHourChange(hour.day_of_week, 'is_closed', checked)
                                      }
                                    />
                                  </div>
                                </div>
                                
                                {!hour.is_closed && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`start-${hour.day_of_week}`}>시작 시간</Label>
                                      <Select
                                        value={hour.start_time}
                                        onValueChange={(value) => 
                                          handleOperatingHourChange(hour.day_of_week, 'start_time', value)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="시작 시간 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {timeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`end-${hour.day_of_week}`}>종료 시간</Label>
                                      <Select
                                        value={hour.end_time}
                                        onValueChange={(value) => 
                                          handleOperatingHourChange(hour.day_of_week, 'end_time', value)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="종료 시간 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {timeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                                
                                {hour.is_closed && (
                                  <div className="text-center py-4 text-gray-500">
                                    휴무일로 설정되었습니다.
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            <div className="flex justify-end">
                              <Button
                                onClick={handleSaveOperatingHours}
                                disabled={savingOperatingHours}
                                className="px-6"
                              >
                                {savingOperatingHours ? (
                                  <>
                                    <span className="mr-2">저장 중...</span>
                                    <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div>
                                  </>
                                ) : '운영시간 저장'}
                              </Button>
                            </div>
                          </div>
                        )}
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