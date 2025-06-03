"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { toast } from '@/shared/hooks';
import { Customer } from '@/types';
import { PostgrestError } from '@supabase/supabase-js';

interface CustomerTag {
  id: string;
  name: string;
  color?: string;
}

interface CustomerTagMapping {
  customer_id: string;
  tag_id: string;
}

export function useCustomerData() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 태그 관련 상태
  const [availableTags, setAvailableTags] = useState<CustomerTag[]>([]);
  const [customerTags, setCustomerTags] = useState<CustomerTagMapping[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  const supabase = useSupabase();

  // 고객 목록 조회
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setAllCustomers(data || []);
    } catch (err: unknown) {
      console.error('고객 정보 로딩 오류:', err);
      
      if (typeof err === 'object' && err !== null) {
        const postgrestError = err as PostgrestError;
        setError(postgrestError.message || '고객 정보를 불러오는데 실패했습니다.');
      } else {
        setError('고객 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 태그 데이터 로드
  const fetchTags = useCallback(async () => {
    try {
      setTagsLoading(true);
      
      // 태그 목록 로드
      const { data: tagsData, error: tagsError } = await supabase
        .from('customer_tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;

      // 고객-태그 매핑 로드
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('customer_tag_mappings')
        .select('*');

      if (mappingsError) throw mappingsError;

      setAvailableTags(tagsData || []);
      setCustomerTags(mappingsData || []);
    } catch (error: any) {
      console.error('태그 데이터 로드 실패:', error);
      toast({
        title: "오류",
        description: "태그 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setTagsLoading(false);
    }
  }, [supabase]);

  // 고객 생성
  const createCustomer = useCallback(async (customerData: {
    email: string;
    nickname: string;
    phone: string;
    password: string;
  }) => {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: customerData.email,
        password: customerData.password,
        email_confirm: true,
        user_metadata: {
          nickname: customerData.nickname,
          phone: customerData.phone,
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            nickname: customerData.nickname,
            phone: customerData.phone,
          })
          .eq('id', data.user.id);

        if (updateError) throw updateError;

        toast({
          title: "성공",
          description: "새 고객이 등록되었습니다.",
        });

        await fetchCustomers();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('고객 생성 오류:', error);
      toast({
        title: "오류",
        description: error.message || "고객 등록에 실패했습니다.",
        variant: "destructive",
      });
      return false;
    }
  }, [supabase, fetchCustomers]);

  // 고객 정보 업데이트
  const updateCustomer = useCallback(async (customerId: string, updates: {
    nickname?: string;
    phone?: string;
    company_name?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "성공",
        description: "고객 정보가 수정되었습니다.",
      });

      await fetchCustomers();
      return true;
    } catch (error: any) {
      console.error('고객 수정 오류:', error);
      toast({
        title: "오류",
        description: "고객 정보 수정에 실패했습니다.",
        variant: "destructive",
      });
      return false;
    }
  }, [supabase, fetchCustomers]);

  // 쿠폰/적립시간 부여
  const grantRewards = useCallback(async (
    customerId: string,
    type: 'coupon' | 'time',
    minutes: number
  ) => {
    try {
      if (type === 'coupon') {
        // 쿠폰 발급 로직
        const { error } = await supabase
          .from('customer_coupons')
          .insert({
            customer_id: customerId,
            minutes: minutes,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
            is_used: false
          });

        if (error) throw error;

        toast({
          title: "성공",
          description: `${minutes}분 쿠폰이 발급되었습니다.`,
        });
      } else {
        // 적립시간 추가 로직
        const { error } = await supabase.rpc('add_accumulated_time', {
          customer_id: customerId,
          minutes_to_add: minutes
        });

        if (error) throw error;

        toast({
          title: "성공",
          description: `${minutes}분이 적립되었습니다.`,
        });

        await fetchCustomers(); // 고객 정보 갱신
      }
      
      return true;
    } catch (error: any) {
      console.error('리워드 부여 오류:', error);
      
      // 에러 메시지 개선
      let errorMessage = "리워드 부여에 실패했습니다.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [supabase, fetchCustomers]);

  // 태그 관련 함수들
  const addTagToCustomer = useCallback(async (customerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('customer_tag_mappings')
        .insert({ customer_id: customerId, tag_id: tagId });

      if (error) throw error;

      toast({
        title: "성공",
        description: "태그가 추가되었습니다.",
      });

      await fetchTags();
      return true;
    } catch (error: any) {
      toast({
        title: "오류",
        description: "태그 추가에 실패했습니다.",
        variant: "destructive",
      });
      return false;
    }
  }, [supabase, fetchTags]);

  const removeTagFromCustomer = useCallback(async (customerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('customer_tag_mappings')
        .delete()
        .eq('customer_id', customerId)
        .eq('tag_id', tagId);

      if (error) throw error;

      toast({
        title: "성공",
        description: "태그가 제거되었습니다.",
      });

      await fetchTags();
      return true;
    } catch (error: any) {
      toast({
        title: "오류",
        description: "태그 제거에 실패했습니다.",
        variant: "destructive",
      });
      return false;
    }
  }, [supabase, fetchTags]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchCustomers();
    fetchTags();
  }, [fetchCustomers, fetchTags]);

  return {
    // 데이터
    allCustomers,
    loading,
    error,
    
    // 태그 관련
    availableTags,
    customerTags,
    tagsLoading,
    
    // 액션
    fetchCustomers,
    createCustomer,
    updateCustomer,
    grantRewards,
    addTagToCustomer,
    removeTagFromCustomer,
  };
} 