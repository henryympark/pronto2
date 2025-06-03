"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

type ServiceInfoTabProps = {
  selectedService: Service;
  onServiceUpdate?: () => void;
};

export function ServiceInfoTab({ selectedService, onServiceUpdate }: ServiceInfoTabProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const supabaseAdmin = createAdminClient();
  
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
    setSaving(true);
    setSaveMessage(null);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      let imageUrl = selectedService.image_url;
      
      // 이미지 업로드 처리
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from('service-images')
          .upload(fileName, imageFile);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // 업로드된 이미지의 public URL 가져오기
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('service-images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }
      
      // 서비스 정보 업데이트
      const { error } = await supabaseAdmin
        .from('services')
        .update({
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          price_per_hour: parseInt(formData.get('price_per_hour') as string),
          location: formData.get('location') as string,
          notice: formData.get('notice') as string,
          refund_policy: formData.get('refund_policy') as string,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedService.id);
        
      if (error) {
        throw error;
      }
      
      setSaveMessage({
        type: 'success',
        text: '서비스 정보가 성공적으로 업데이트되었습니다.'
      });
      
      // 이미지 미리보기 초기화
      setImageFile(null);
      setImagePreview(null);
      
      // 부모 컴포넌트에 업데이트 알림
      onServiceUpdate?.();
      
    } catch (err: any) {
      console.error('서비스 정보 업데이트 오류:', err);
      setSaveMessage({
        type: 'error',
        text: err.message || '서비스 정보 업데이트에 실패했습니다.'
      });
    } finally {
      setSaving(false);
      
      // 메시지 자동 제거
      setTimeout(() => {
        setSaveMessage(null);
      }, 5000);
    }
  };
  
  return (
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
  );
} 