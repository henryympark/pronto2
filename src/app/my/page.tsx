"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { format, parseISO, addMinutes, isBefore, isAfter } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LogOut, User, Star, Clock, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PriceChangeInfo from "@/components/PriceChangeInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeWithoutSeconds, formatTimeDisplay } from "@/lib/date-utils";
import { ReservationStatus } from "@/types";
import { AppError, ErrorCode } from "@/types";
import { handleError, logError, getUserFriendlyErrorMessage } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Link from "next/link";

// 서비스 타입 정의
interface Service {
  id: string;
  name: string;
}

// 예약 타입 정의
interface Reservation {
  id: string;
  service_id: string;
  customer_id?: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: string;
  customer_name?: string;
  created_at: string;
  updated_at: string;
  // 가격 변동 관련 필드
  original_total_price?: number;
  recalculated_total_amount?: number;
  pending_payment_amount?: number;
  pending_refund_amount?: number;
  // 환불 관련 필드
  paid_amount?: number;
  refunded?: boolean;
  refunded_at?: string;
  // UI에서 사용하는 파생 필드
  service?: Service;
  company_name?: string;
  purpose?: string;
  car_number?: string;
  memo?: string;
  // 리뷰 관련 필드
  has_review?: boolean;
}

// 필터 유형 정의
type FilterType = 'upcoming' | 'completed' | 'cancelled';

// 디버깅 정보 타입
interface DebugInfo {
  reservations?: Reservation[];
  count?: number;
  message?: string;
}

export default function MyPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  
  // 오류 상태 변수 추가
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // 회원 탈퇴 관련 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 예약 변경/취소 관련 상태
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelingReservation, setCancelingReservation] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 디버깅 상태
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  
  // 액션 플래그 - useEffect 내 리디렉션/데이터 로드 한 번만 실행하도록
  const actionAttemptedRef = useRef(false);
  
  // 초기 데이터 로드 상태 플래그 (성능 최적화)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 수동 새로고침 핸들러
  const handleRefresh = () => {
    if (isLoading) return; // 이미 로딩 중이면 무시
    
    console.log('마이페이지 수동 새로고침 시작...');
    // 오류 상태 초기화
    setHasError(false);
    setErrorMessage("");
    // 로딩 상태 설정
    setIsLoading(true);
    
    // useEffect 내의 loadData 함수와 동일한 로직 수행
    // 병렬로 모든 데이터 요청 시작 (Promise.allSettled로 변경)
    Promise.allSettled([
      fetchReservations(),
      fetchSimplifiedData()
    ]).then(results => {
      // 결과 확인 및 로깅
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`새로고침 데이터 로드 ${index} 실패:`, result.reason);
        }
      });
      
      console.log('마이페이지 수동 새로고침 완료');
    }).catch(error => {
      console.error("수동 새로고침 중 오류 발생:", error);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  // 로그아웃 처리 함수
  const handleSignOut = async () => {
    try {
      console.log('로그아웃 시도 중...');
      
      // signOut 함수 호출 (리디렉션은 AuthContext에서 처리)
      await signOut();
      // 여기서 추가 작업을 하지 않음 - AuthContext에서 모든 작업 처리
    } catch (error) {
      console.error("로그아웃 에러:", error);
      toast.error("로그아웃 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
    }
  };

  // 디버깅 함수
  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug/reservations');
      const data = await response.json() as DebugInfo;
      console.log('디버깅 정보:', data);
      setDebugInfo(data);
    } catch (error) {
      console.error('디버깅 정보 조회 실패:', error);
    }
  };

  // 테스트 서비스 생성 함수
  const createTestService = async () => {
    try {
      const response = await fetch('/api/debug/create-test-service');
      const data = await response.json() as { success: boolean; error?: string };
      console.log('테스트 서비스 생성 결과:', data);
      if (data.success) {
        toast.success("테스트 서비스가 성공적으로 생성되었습니다.");
      } else {
        toast.error(data.error || "오류가 발생했습니다.");
      }
    } catch (error) {
      console.error('테스트 서비스 생성 실패:', error);
      toast.error("API 호출 중 오류가 발생했습니다.");
    }
  };

  // 테스트 예약 생성 함수
  const createTestReservations = async () => {
    try {
      const response = await fetch('/api/debug/create-test-reservation');
      const data = await response.json() as { success: boolean; count?: number; error?: string };
      console.log('테스트 예약 생성 결과:', data);
      if (data.success) {
        toast.success(`${data.count}개의 테스트 예약이 성공적으로 생성되었습니다.`);
        // 예약 목록 새로고침
        fetchReservations();
      } else {
        toast.error(data.error || "오류가 발생했습니다.");
      }
    } catch (error) {
      console.error('테스트 예약 생성 실패:', error);
      toast.error("API 호출 중 오류가 발생했습니다.");
    }
  };

  // 예약 데이터를 가져오는 함수를 컴포넌트 외부로 분리
  const fetchReservations = async (retryCount = 0, maxRetries = 2) => {
    if (!user || !user.id) {
      console.error('fetchReservations: 사용자 정보 없음 - 사용자 ID가 필요합니다.');
      setHasError(true);
      setErrorMessage("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
      return; // 사용자 정보가 없거나 ID가 없으면 조기 종료
    }

    console.log('fetchReservations 시작 - 사용자 ID:', user.id);
    
    try {
      // 세션 확인 - 인증 상태 검증
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('세션 확인 오류:', sessionError);
          throw new Error('인증 세션 확인 실패');
        }
        
        if (!sessionData.session) {
          console.error('유효한 세션이 없습니다. 재로그인이 필요할 수 있습니다.');
          throw new Error('유효한 인증 세션 없음');
        }
        
        console.log('인증 세션 확인 성공');
      } catch (sessionErr) {
        console.warn('세션 확인 중 오류 발생:', sessionErr);
        // 세션 오류가 발생해도 계속 시도 (로컬 상태로 인증되었을 가능성)
      }
      
      // customer_id 검증 - 잘못된 형식이면 조기 종료
      if (typeof user.id !== 'string' || user.id.length < 10) {
        console.error('유효하지 않은 사용자 ID 형식:', user.id);
        throw new Error('유효하지 않은 사용자 ID 형식');
      }
      
      // RPC 함수 최적화 호출 - 부가적인 동기화 작업은 별도 비동기로 처리
      console.log('get_user_reservations RPC 호출 시작');
      
      // RPC 함수 정의 확인 (디버깅용)
      try {
        const { data: funcInfo, error: funcError } = await supabase
          .from('pg_proc')
          .select('*')
          .eq('proname', 'get_user_reservations')
          .limit(1);
          
        if (funcError) {
          console.warn('RPC 함수 정의 확인 실패:', funcError.message);
        } else if (funcInfo && funcInfo.length > 0) {
          console.log('RPC 함수 정의 확인 성공:', funcInfo[0].proname);
        } else {
          console.warn('RPC 함수 정의를 찾을 수 없습니다.');
        }
      } catch (funcCheckErr) {
        console.warn('RPC 함수 정의 확인 중 오류:', funcCheckErr);
      }
      
      try {
        // 정의된 파라미터만 전달 (cache_buster 제거)
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_user_reservations', { 
            user_id: user.id
          });
          
        if (rpcError) {
          console.warn('RPC 조회 실패, 일반 쿼리로 진행. 오류 메시지:', rpcError.message || '오류 정보 없음', 'Code:', rpcError.code || '코드 없음');
          // RPC 오류 세부 정보 기록
          if (rpcError.details) console.warn('RPC 오류 세부 정보:', rpcError.details);
          if (rpcError.hint) console.warn('RPC 오류 힌트:', rpcError.hint);
          
          // RPC 함수 존재 여부 확인
          try {
            const { data: routines, error: routinesError } = await supabase
              .from('information_schema.routines')
              .select('routine_name, specific_name, routine_definition')
              .eq('routine_name', 'get_user_reservations')
              .eq('routine_schema', 'public');
              
            if (routinesError) {
              console.warn('RPC 함수 정보 조회 실패:', routinesError);
            } else if (routines && routines.length > 0) {
              console.log('RPC 함수가 존재합니다:', routines.length, '개 발견');
              routines.forEach((r, i) => {
                console.log(`RPC 함수 ${i+1} 이름:`, r.routine_name);
                console.log(`RPC 함수 ${i+1} 구체적 이름:`, r.specific_name);
              });
            } else {
              console.warn('RPC 함수가 존재하지 않습니다.');
            }
          } catch (routineCheckErr) {
            console.warn('RPC 함수 정보 조회 중 오류:', routineCheckErr);
          }
          
          // 일반 쿼리로 진행
          throw new Error(rpcError.message || 'RPC 함수 호출 실패');
        }
        
        if (rpcData) {
          console.log('RPC를 통한 예약 정보 조회 성공:', (rpcData || []).length, '개의 예약');
          
          // RPC 성공 시 데이터 처리 (빈 배열도 정상 처리)
          const formattedData: Reservation[] = (rpcData || []).map((item: any) => {
            // service_details 처리 - JSON 문자열 또는 객체 모두 처리 가능하도록
            let serviceDetails;
            try {
              if (item.service_details) {
                if (typeof item.service_details === 'string') {
                  serviceDetails = JSON.parse(item.service_details);
                } else {
                  serviceDetails = item.service_details;
                }
              } else {
                serviceDetails = { id: item.service_id, name: '알 수 없는 서비스' };
              }
            } catch (err) {
              console.warn('서비스 상세 정보 파싱 오류:', err);
              serviceDetails = { id: item.service_id, name: '알 수 없는 서비스' };
            }
            
            return {
              ...item,
              service: serviceDetails,
              company_name: item.company_name || '',
              purpose: item.shooting_purpose || '',
              car_number: item.vehicle_number || '',
              memo: '',
              paid_amount: 0,
              refunded: false,
              refunded_at: null,
              has_review: item.has_review === true
            };
          });
          
          setReservations(formattedData);
          const filtered = applyFilter(formattedData, activeFilter);
          console.log('필터링 후 예약 데이터:', filtered.length, '개의 예약');
          setHasError(false);
          return; // 성공적으로 처리됨, 일반 쿼리 생략
        }
        
        // RPC 호출 실패 시 일반 쿼리로 진행
        console.log('RPC 결과가 없어 일반 쿼리로 진행');
      } catch (rpcError) {
        console.warn('RPC 처리 중 예외 발생:', rpcError);
        // 계속 진행하여 일반 쿼리 시도
      }
      
      // 일반 쿼리로 진행
      console.log('일반 쿼리를 통한 예약 정보 조회 시도');
      
      // 캐시 방지를 위한 동적 쿼리 - 매번 새로운 쿼리를 보내도록 처리
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMin = currentTime.getMinutes();
      
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            id,
            service_id,
            customer_id,
            reservation_date,
            start_time,
            end_time,
            total_hours,
            total_price,
            status,
            customer_name,
            created_at,
            updated_at,
            original_total_price,
            recalculated_total_amount,
            pending_payment_amount,
            pending_refund_amount,
            has_review,
            service:services(id, name),
            company_name,
            shooting_purpose,
            vehicle_number
          `)
          .eq('customer_id', user.id)
          // 캐싱 방지를 위한 동적 조건 - 항상 참이지만 매번 다른 쿼리를 생성
          .or(`updated_at.gt.${currentHour-24},updated_at.gt.${currentHour-23}`)
          .order('reservation_date', { ascending: false });
    
        if (error) {
          console.error('예약 정보 일반 쿼리 조회 오류:', error.message);
          // 오류 세부 정보 로깅
          if (error.details) console.error('오류 세부 정보:', error.details);
          if (error.hint) console.error('오류 힌트:', error.hint);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log('예약 데이터 수신 성공:', data.length, '개의 예약');
          
          const formattedData: Reservation[] = data.map((item: any) => {
            // service가 null일 경우 기본값 제공
            const serviceData = item.service 
              ? (Array.isArray(item.service) && item.service.length > 0
                ? item.service[0]
                : item.service)
              : { id: item.service_id, name: '알 수 없는 서비스' };
            
            return {
              ...item,
              service: serviceData as Service,
              company_name: item.company_name || '',
              purpose: item.shooting_purpose || '',
              car_number: item.vehicle_number || '',
              memo: '',
              paid_amount: 0,
              refunded: false,
              refunded_at: null,
              has_review: item.has_review === true
            };
          });
          
          setReservations(formattedData);
          const filtered = applyFilter(formattedData, activeFilter);
          console.log('필터링 후 예약 데이터:', filtered.length, '개의 예약');
          setHasError(false);
        } else {
          console.log('예약 데이터 없음 또는 빈 배열 반환됨');
          setReservations([]);
          setFilteredReservations([]);
        }
      } catch (queryError) {
        console.error('일반 쿼리 실패, API 폴백 시도:', queryError);
        
        // API 엔드포인트 존재 여부 확인 (개발 환경 등에서는 없을 수 있음)
        const hasApiEndpoint = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname.includes('pronto'));
        
        if (hasApiEndpoint) {
          // API 엔드포인트를 통한 폴백 시도
          try {
            console.log('API 엔드포인트를 통한 예약 데이터 조회 시도');
            const response = await fetch(`/api/reservations/user?timestamp=${Date.now()}`);
            
            if (!response.ok) {
              throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
            }
            
            const apiData = await response.json();
            
            if (apiData && Array.isArray(apiData.data) && apiData.data.length > 0) {
              console.log('API를 통한 예약 데이터 수신 성공:', apiData.data.length, '개의 예약');
              
              const formattedData = apiData.data.map((item: any) => ({
                ...item,
                service: item.service || { id: item.service_id, name: '알 수 없는 서비스' },
                company_name: item.company_name || '',
                purpose: item.shooting_purpose || '',
                car_number: item.vehicle_number || '',
                memo: '',
                paid_amount: item.paid_amount || 0,
                refunded: item.refunded || false,
                refunded_at: item.refunded_at || null,
                has_review: item.has_review === true
              }));
              
              setReservations(formattedData);
              const filtered = applyFilter(formattedData, activeFilter);
              console.log('API 필터링 후 예약 데이터:', filtered.length, '개의 예약');
              setHasError(false);
              return; // 성공적으로 데이터를 가져왔으므로 종료
            } else {
              console.log('API를 통한 예약 데이터 없음');
              setReservations([]);
              setFilteredReservations([]);
              return; // 데이터가 없어도 정상 처리로 간주
            }
          } catch (apiError) {
            console.error('API 폴백도 실패:', apiError);
            // API 폴백이 실패해도 계속 진행 (오류 전파하지 않음)
          }
        } else {
          console.log('API 엔드포인트 건너뜀 (개발 환경 또는 미지원)');
        }
        
        // 모든 데이터 소스에서 실패한 경우 빈 결과로 처리
        console.warn('모든 데이터 소스에서 예약 정보를 가져오지 못했습니다. 빈 결과로 처리합니다.');
        setReservations([]);
        setFilteredReservations([]);
      }
    } catch (error: any) {
      // 오류 객체 세부 분석 및 디버깅 정보 기록
      let errorMessage = '예약 정보를 불러오는 중 오류가 발생했습니다.';
      console.error('예약 정보 조회 오류 상세 정보:', error);
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        console.error('예약 정보 조회 중 오류 발생 (Error 객체):', error.message, error.stack);
      } else if (typeof error === 'object' && error !== null) {
        // Supabase 오류 객체일 수 있는 경우
        const possibleMsg = error.message || error.error || error.errorMessage;
        const possibleCode = error.code || error.statusCode || error.status;
        errorMessage = possibleMsg || errorMessage;
        
        console.error('예약 정보 조회 중 오류 발생 (객체):', {
          message: possibleMsg,
          code: possibleCode,
          details: error.details || error.errorDetails,
          hint: error.hint,
          fullObject: JSON.stringify(error)
        });
      } else {
        console.error('예약 정보 조회 중 오류 발생 (기타 유형):', error);
      }
      
      // 오류 상태 업데이트
      setHasError(true);
      setErrorMessage(errorMessage);
      
      // 사용자에게 오류 알림
      toast.error(errorMessage);
      
      // 상태 초기화
      setReservations([]);
      setFilteredReservations([]);
    }
  };