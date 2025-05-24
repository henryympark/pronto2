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
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.",
        variant: "destructive",
      });
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
      toast({
        title: "테스트 서비스 생성",
        description: data.success 
          ? "테스트 서비스가 성공적으로 생성되었습니다." 
          : data.error || "오류가 발생했습니다.",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('테스트 서비스 생성 실패:', error);
      toast({
        title: "테스트 서비스 생성 실패",
        description: "API 호출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 테스트 예약 생성 함수
  const createTestReservations = async () => {
    try {
      const response = await fetch('/api/debug/create-test-reservation');
      const data = await response.json() as { success: boolean; count?: number; error?: string };
      console.log('테스트 예약 생성 결과:', data);
      toast({
        title: "테스트 예약 생성",
        description: data.success 
          ? `${data.count}개의 테스트 예약이 성공적으로 생성되었습니다.` 
          : data.error || "오류가 발생했습니다.",
        variant: data.success ? "default" : "destructive",
      });
      
      // 예약 목록 새로고침
      if (data.success) {
        fetchReservations();
      }
    } catch (error) {
      console.error('테스트 예약 생성 실패:', error);
      toast({
        title: "테스트 예약 생성 실패",
        description: "API 호출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
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
      toast({
        title: "예약 정보 조회 실패",
        description: errorMessage,
        variant: "destructive",
      });
      
      // 상태 초기화
      setReservations([]);
      setFilteredReservations([]);
    }
  };

  // 로그인 상태 확인 및 데이터 로드 최적화
  useEffect(() => {
    // 초기화 시 로딩 타임아웃 제거
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    // 고유 식별자 (디버깅용)
    const debugId = Math.floor(Math.random() * 10000);
    console.log(`[MyPage ${debugId}] useEffect 실행, loading: ${loading}, user: ${user ? '있음' : '없음'}`);
    
    // 로컬 세션 확인 - 브라우저에 저장된 토큰으로 로그인 상태 검증
    const checkLocalSession = async () => {
      try {
        // 로컬 스토리지에서 supabase 세션 확인
        const localStorageSession = 
          typeof localStorage !== 'undefined' && 
          localStorage.getItem('supabase.auth.token');
          
        // 쿠키에서 세션 확인
        const hasCookieSession = 
          typeof document !== 'undefined' && 
          document.cookie.includes('supabase-auth-token');
          
        if (localStorageSession || hasCookieSession) {
          console.log(`[MyPage ${debugId}] 로컬 세션 감지됨, 세션 복구 대기...`);
          
          // 세션이 존재하지만 user 객체가 없는 경우, 세션 복구 시도
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error(`[MyPage ${debugId}] 세션 복구 오류:`, error);
          } else if (data?.session) {
            console.log(`[MyPage ${debugId}] 세션 복구 성공, 사용자 ID: ${data.session.user.id}`);
            return true; // 유효한 세션 존재
          }
        }
        
        return false; // 유효한 세션 없음
      } catch (error) {
        console.error(`[MyPage ${debugId}] 로컬 세션 확인 중 오류:`, error);
        return false;
      }
    };
    
    // 로딩 중일 때는 대기 (타임아웃 시간 15초로 증가)
    if (loading) {
      console.log(`[MyPage ${debugId}] 인증 상태 로딩 중... 대기`);
      
      // 로컬 세션 확인 - 타임아웃 예방
      checkLocalSession().then(hasLocalSession => {
        if (hasLocalSession) {
          console.log(`[MyPage ${debugId}] 유효한 로컬 세션 감지, 타임아웃 취소`);
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
          }
        }
      });
      
      // 로딩 지연 시 타임아웃 설정 (15초로 연장)
      loadTimeoutRef.current = setTimeout(() => {
        if (loading) {
          console.log(`[MyPage ${debugId}] 로딩 타임아웃 (15초) 도달`);
          
          // 세션 복구 시도
          checkLocalSession().then(hasLocalSession => {
            if (hasLocalSession) {
              console.log(`[MyPage ${debugId}] 타임아웃 발생했지만 유효한 로컬 세션이 있습니다. 페이지 새로고침 시도...`);
              // 페이지 새로고침 
              if (typeof window !== 'undefined') {
                // 새로고침 무한 루프 방지를 위해 플래그 설정
                sessionStorage.setItem('retry_my_page', 'true');
                window.location.reload();
              }
            } else {
              console.log(`[MyPage ${debugId}] 로그인 페이지로 리디렉션`);
              try {
                sessionStorage.setItem('my_to_login_redirect_time', Date.now().toString());
                sessionStorage.setItem('my_page_timeout_redirect', 'true');
                router.push('/auth/login');
              } catch (error) {
                console.error(`[MyPage ${debugId}] 타임아웃 리디렉션 오류:`, error);
              }
            }
          });
        }
      }, 15000); // 15초로 연장
      
      return () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      };
    }
    
    // 로그인 상태 확인 및 디버깅
    if (user) {
      console.log(`[MyPage ${debugId}] 사용자 정보:`, {
        id: user.id,
        email: user.email
      });
      
      // 반복된 새로고침 방지를 위한 플래그 제거
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('retry_my_page')) {
        sessionStorage.removeItem('retry_my_page');
      }
      
      // 인증 상태 확인
      if (!initialDataLoaded) {
        console.log(`[MyPage ${debugId}] 초기 데이터 로드 시작`);
        
        // 데이터 로드 상태 설정
        setIsLoading(true);
        
        // 데이터 로드 함수 - 비동기 병렬 처리로 최적화
        const loadInitialData = async () => {
          try {
            // Promise.all 대신 Promise.allSettled 사용하여 부분 실패 허용
            const results = await Promise.allSettled([
              fetchReservations(),
              fetchSimplifiedData()
            ]);
            
            // 결과 확인 및 로깅
            let hasFailures = false;
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                hasFailures = true;
                console.warn(`초기 데이터 로드 요청 ${index} 실패:`, result.reason);
              }
            });
            
            // 모든 요청이 실패한 경우 특별 처리
            if (hasFailures && results.every(r => r.status === 'rejected')) {
              console.error(`[MyPage ${debugId}] 모든 초기 데이터 로드 요청이 실패했습니다. 세션 복구 시도...`);
              
              // 세션 복구 시도
              try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) {
                  console.error('세션 리프레시 실패:', error);
                } else {
                  console.log('세션 리프레시 성공, 데이터 다시 로드 시도');
                  
                  // 세션 리프레시 후 데이터 다시 로드 시도
                  setTimeout(() => {
                    setInitialDataLoaded(false);  // 데이터 로드 플래그 재설정
                  }, 1000);
                }
              } catch (refreshErr) {
                console.error('세션 리프레시 중 오류:', refreshErr);
              }
            }
            
            console.log(`[MyPage ${debugId}] 초기 데이터 로드 완료`);
          } catch (error) {
            console.error(`[MyPage ${debugId}] 초기 데이터 로드 오류:`, error);
          } finally {
            setIsLoading(false);
            setInitialDataLoaded(true);
          }
        };
        
        // 즉시 데이터 로드 시작
        loadInitialData();
      }
    } else if (!loading) {
      // 로그인 상태가 아닌 경우 로그인 페이지로 리디렉션
      console.log(`[MyPage ${debugId}] 비로그인 상태 감지, 로컬 세션 확인 중...`);
      
      // 로컬 세션 확인 후 처리
      checkLocalSession().then(hasLocalSession => {
        if (hasLocalSession) {
          console.log(`[MyPage ${debugId}] 유효한 로컬 세션이 있지만 로그인 상태가 아닙니다. 페이지 새로고침 시도...`);
          
          // 이미 새로고침을 시도했는지 확인
          if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('retry_my_page')) {
            // 새로고침 무한 루프 방지를 위해 플래그 설정
            sessionStorage.setItem('retry_my_page', 'true');
            window.location.reload();
            return;
          }
        }
        
        // 세션이 없거나 이미 새로고침 시도했으면 로그인 페이지로 이동
        try {
          // 리디렉션 무한 루프 방지 로직
          const now = Date.now();
          const lastRedirectTime = sessionStorage.getItem('my_to_login_redirect_time');
          
          if (lastRedirectTime && (now - parseInt(lastRedirectTime, 10)) < 3000) {
            console.log(`[MyPage ${debugId}] 3초 내 반복 리디렉션 감지, 무시`);
            return;
          }
          
          sessionStorage.setItem('my_to_login_redirect_time', now.toString());
          console.log(`[MyPage ${debugId}] 로그인 페이지로 리디렉션 실행`);
          router.push('/auth/login');
        } catch (error) {
          console.error(`[MyPage ${debugId}] 로그인 페이지 리디렉션 오류:`, error);
        }
      });
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [user, loading]);
  
  // 필터 함수 구현 (missing function error 해결)
  const applyFilter = (allReservations: Reservation[], filterType: FilterType) => {
    if (!allReservations || allReservations.length === 0) {
      return [];
    }
    
    // 필터링 로직
    let filtered: Reservation[] = [];
    const now = new Date();
    
    switch (filterType) {
      case 'upcoming':
        // 이용 예정 - 예약 상태가 confirmed, modified이고 예약 일시가 현재보다 미래인 경우
        filtered = allReservations.filter(res => {
          const endDateTime = new Date(`${res.reservation_date}T${res.end_time}`);
          return (res.status === 'confirmed' || res.status === 'modified') && 
                 endDateTime > now;
        });
        break;
      case 'completed':
        // 이용 완료 - 예약 상태가 completed이거나 confirmed/modified이면서 예약 종료 시간이 현재보다 과거인 경우
        filtered = allReservations.filter(res => {
          const endDateTime = new Date(`${res.reservation_date}T${res.end_time}`);
          return res.status === 'completed' || 
                 ((res.status === 'confirmed' || res.status === 'modified') && endDateTime <= now);
        });
        break;
      case 'cancelled':
        // 취소 내역 - 예약 상태가 cancelled인 경우
        filtered = allReservations.filter(res => res.status === 'cancelled');
        break;
      default:
        filtered = allReservations;
    }
    
    // 필터링된 예약 결과 저장
    setFilteredReservations(filtered);
    return filtered;
  };
  
  // 필터 변경 핸들러 구현 (missing function error 해결)
  const handleFilterChange = (filterType: FilterType) => {
    setActiveFilter(filterType);
    applyFilter(reservations, filterType);
  };
  
  // 예약 클릭 핸들러 구현 (missing function error 해결)
  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };
  
  // 내 정보 클릭 핸들러 구현 (missing function error 해결)
  const handleMyInfoClick = () => {
    // 내 정보 페이지로 이동
    router.push('/my/profile');
  };
  
  // 시간 포맷 함수 구현 (missing function error 해결)
  const formatTimeString = (timeStr: string) => {
    if (!timeStr) return '';
    // 형식이 'HH:MM:SS'인 경우 'HH:MM'으로 변환
    return timeStr.substring(0, 5);
  };
  
  // 예약 상태 스타일 함수 구현 (missing function error 해결)
  const getStatusColorClass = (reservation: Reservation) => {
    const status = reservation.status || '';
    
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'modified':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  // 예약 상태 텍스트 함수 구현 (missing function error 해결)
  const getStatusText = (reservation: Reservation) => {
    const status = reservation.status || '';
    
    switch (status) {
      case 'confirmed':
        return '예약 확정';
      case 'completed':
        return '이용 완료';
      case 'cancelled':
        return '예약 취소';
      case 'modified':
        return '예약 변경됨';
      default:
        return '알 수 없음';
    }
  };
  
  // 예약 변경 가능 여부 함수 구현 (missing function error 해결)
  const canChangeReservation = (reservation: Reservation) => {
    if (!reservation) return false;
    
    // 예약 취소된 상태는 변경 불가
    if (reservation.status === 'cancelled') return false;
    
    // 이용 완료된 상태는 변경 불가
    if (reservation.status === 'completed') return false;
    
    // 예약 시작 시간이 현재보다 과거인 경우 변경 불가
    const startDateTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`);
    return startDateTime > new Date();
  };
  
  // 예약 취소 가능 여부 함수 구현 (missing function error 해결)
  const canCancelReservation = (reservation: Reservation) => {
    if (!reservation) return false;
    
    // 이미 취소된 예약은 취소 불가
    if (reservation.status === 'cancelled') return false;
    
    // 이용 완료된 상태는 취소 불가
    if (reservation.status === 'completed') return false;
    
    // 예약 종료 시간이 현재보다 과거인 경우 취소 불가
    const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
    return endDateTime > new Date();
  };
  
  // 예약 변경 핸들러 구현 (missing function error 해결)
  const handleChangeReservation = (reservationId: string) => {
    // 예약 변경 페이지로 이동
    router.push(`/my/reservations/change/${reservationId}`);
  };
  
  // 예약 취소 핸들러 구현 (missing function error 해결)
  const handleCancelReservation = async () => {
    if (!cancelingReservation) return;
    
    setIsCancelling(true);
    
    try {
      console.log('예약 취소 요청 시작:', cancelingReservation.id);
      
      // 취소 요청 API 호출 로직 (여기서는 간소화)
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', cancelingReservation.id);
        
      if (error) throw error;
      
      console.log('예약 취소 성공');
      
      // 모달 닫기 및 상태 초기화
      setIsCancelModalOpen(false);
      setCancelingReservation(null);
      
      // 예약 목록 새로고침
      fetchReservations();
      
      // 성공 메시지
      toast({
        title: "예약 취소 완료",
        description: "예약이 성공적으로 취소되었습니다.",
        variant: "default",
      });
    } catch (error) {
      console.error('예약 취소 실패:', error);
      toast({
        title: "예약 취소 실패",
        description: "예약 취소 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };
  
  // 회원 탈퇴 핸들러 구현 (missing function error 해결)
  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    setDeleteError("");
    
    try {
      console.log('회원 탈퇴 요청 시작');
      
      // 회원 탈퇴 요청 API 호출 로직 (여기서는 간소화)
      if (!user) {
        console.error('사용자 정보가 없습니다');
        return;
      }
      const { error } = await supabase.auth.admin.deleteUser(user.id);
        
      if (error) throw error;
      
      console.log('회원 탈퇴 성공');
      
      // 모달 닫기
      setIsDeleteModalOpen(false);
      
      // 로그아웃
      await signOut();
      
      // 성공 메시지
      toast({
        title: "회원 탈퇴 완료",
        description: "회원 탈퇴가 성공적으로 처리되었습니다.",
        variant: "default",
      });
    } catch (error) {
      console.error('회원 탈퇴 실패:', error);
      setDeleteError("회원 탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 간소화된 데이터 로드 함수 (missing function error 해결)
  const fetchSimplifiedData = async () => {
    if (!user || !user.id) return;
    
    try {
      console.log('간소화된 데이터 로드 시작 - 사용자 ID:', user.id);
      
      // 대시보드 데이터 호출로 통계 정보 가져오기 - 병렬 처리
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_user_dashboard_data', { 
          user_id: user.id
        });
        
      if (dashboardError) {
        console.warn('대시보드 데이터 오류:', dashboardError.message, 'Code:', dashboardError.code || '코드 없음');
        
        // 기본값 설정
        setAccumulatedTime(0);
        setCouponsCount(0);
        setReviewsCount(0);
      } else if (dashboardData) {
        console.log('대시보드 데이터 로드 성공:', dashboardData);
        
        // 통계 데이터 설정
        setAccumulatedTime(dashboardData.accumulated_time_minutes || 0);
        setCouponsCount(dashboardData.active_coupons_count || 0);
        setReviewsCount(dashboardData.reviews_count || 0);
      }
      
      // 백그라운드에서 고객 정보 동기화 (비차단적 실행)
      Promise.resolve(supabase.rpc('sync_missing_customers'))
        .then(({ error }) => {
          if (error) {
            console.warn('백그라운드 고객 정보 동기화 실패:', error.message);
          } else {
            console.log('백그라운드 고객 정보 동기화 성공');
          }
        })
        .catch(err => console.warn('백그라운드 고객 정보 동기화 오류:', err));
      
    } catch (error) {
      console.error('간소화된 데이터 로드 실패:', error);
      // 기본값으로 설정
      setAccumulatedTime(0);
      setCouponsCount(0);
      setReviewsCount(0);
    }
  };

  // 로딩 및 사용자 상태에 따른 화면 표시 조건
  if (loading) {
    console.log('마이페이지: 로딩 중 상태 감지됨, 로딩 화면 표시');
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    console.log('마이페이지: 인증되지 않은 사용자 감지, 로그인 페이지로 리디렉션');
    // useEffect에서 리디렉션을 기다리는 동안 로딩 화면 표시
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <div className="container py-2 md:py-8">
          {/* 헤더 영역 */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">마이페이지</h1>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </Button>
          </div>
          
          {/* 로딩 중 표시 */}
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">데이터를 불러오는 중입니다...</span>
            </div>
          )}

          {/* 오류 메시지 */}
          {hasError && !isLoading && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>예약 정보 조회 실패</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
              <div className="mt-4">
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  새로고침
                </Button>
              </div>
            </Alert>
          )}

          {/* 예약 없음 안내 */}
          {!isLoading && !hasError && filteredReservations.length === 0 && (
            <div className="text-center py-10">
              <p className="text-lg text-gray-500 mb-4">예약 내역이 없습니다.</p>
              <Link href="/">
                <Button>
                  서비스 둘러보기
                </Button>
              </Link>
            </div>
          )}

          {/* 하단 카드 섹션 - 예약내역 위로 이동 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 적립 시간 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-pronto-primary" />
                  적립 시간
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatTimeDisplay(accumulatedTime)}</p>
                <p className="text-sm text-gray-500">
                  {accumulatedTime > 0 
                    ? `리뷰 작성으로 적립된 시간입니다` 
                    : '리뷰 작성으로 적립 시간을 모아보세요!'}
                </p>
              </CardContent>
            </Card>

            {/* 보유 쿠폰 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="h-5 w-5 mr-2 text-pronto-primary" />
                  보유 쿠폰
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{couponsCount}장</p>
                <p className="text-sm text-gray-500">
                  {couponsCount > 0 
                    ? `사용 가능한 쿠폰이 ${couponsCount}장 있습니다` 
                    : '사용 가능한 쿠폰이 없습니다'}
                </p>
              </CardContent>
            </Card>

            {/* 리뷰 작성 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-pronto-primary" />
                  리뷰 작성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{reviewsCount}건</p>
                <p className="text-sm text-gray-500">
                  {reviewsCount > 0 
                    ? `작성한 리뷰가 ${reviewsCount}건 있습니다` 
                    : '서비스 이용 후 리뷰를 작성해보세요!'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 예약 내역 섹션 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>예약 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 필터링 탭 추가 */}
              <Tabs defaultValue="upcoming" className="mb-6" onValueChange={(value) => handleFilterChange(value as FilterType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upcoming">이용 예정</TabsTrigger>
                  <TabsTrigger value="completed">이용 완료</TabsTrigger>
                  <TabsTrigger value="cancelled">취소 내역</TabsTrigger>
                </TabsList>
              </Tabs>

              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">예약 내역이 없습니다.</p>
                  <Link href="/" className="mt-4 inline-block">
                    <Button>
                      서비스 둘러보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReservations.map((reservation) => (
                    <Card 
                      key={reservation.id} 
                      className="overflow-hidden hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleReservationClick(reservation)}
                    >
                      <CardContent className="p-0">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">
                                {reservation.service?.name || '알 수 없는 서비스'}
                              </h3>
                              <Badge className={getStatusColorClass(reservation)}>
                                {getStatusText(reservation)}
                              </Badge>
                              
                              {/* 환불 정보 표시 - 필드가 없을 수 있으므로 조건 수정 */}
                              {reservation.status === 'cancelled' && (
                                <div className="mt-2 text-sm">
                                  <span className="text-gray-600">
                                    취소 처리 완료
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm text-gray-500 mb-1">
                                {format(parseISO(reservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                                <br />
                                {formatTimeString(reservation.start_time)} ~ {formatTimeString(reservation.end_time)}
                              </p>
                              <p className="font-medium">
                                {reservation.total_price?.toLocaleString() || 0}원
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600">
                                {reservation.company_name && (
                                  <span className="mr-2">회사명: {reservation.company_name}</span>
                                )}
                                {reservation.purpose && (
                                  <span>촬영 목적: {reservation.purpose}</span>
                                )}
                              </p>
                            </div>
                            
                            <div className="flex gap-2">
                              {/* 이용 완료된 예약에 리뷰 작성 버튼 추가 */}
                              {activeFilter === 'completed' && 
                                (reservation.status === 'completed' || 
                                ((reservation.status === 'confirmed' || reservation.status === 'modified') && 
                                  new Date(`${reservation.reservation_date}T${reservation.end_time}`) <= new Date())) && 
                                !reservation.has_review && (
                                <Link 
                                  href={`/my/reviews/write/${reservation.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                  >
                                    리뷰 작성
                                  </Button>
                                </Link>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReservationClick(reservation);
                                }}
                              >
                                상세보기
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 내 정보 및 로그아웃 버튼 */}
          <div className="flex flex-col space-y-4 justify-start mb-8">
            <Link href="/my/profile">
              <Button variant="outline" className="flex items-center justify-center w-40">
                <User className="mr-2 h-4 w-4" />
                내 정보
              </Button>
            </Link>
            <Button variant="outline" onClick={handleSignOut} className="flex items-center justify-center w-40">
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>

          {/* 예약 상세 정보 모달 */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>예약 상세 정보</DialogTitle>
              </DialogHeader>
              
              {selectedReservation && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">서비스</h4>
                    <p>{selectedReservation.service?.name || '알 수 없는 서비스'}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">예약 상태</h4>
                    <Badge className={getStatusColorClass(selectedReservation)}>
                      {getStatusText(selectedReservation)}
                    </Badge>
                    
                    {/* 환불 정보 표시 - 필드가 없을 수 있으므로 조건 수정 */}
                    {selectedReservation.status === 'cancelled' && (
                      <div className="mt-2">
                        <div className="flex items-center text-gray-600">
                          <span>취소 처리 완료</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">예약 일시</h4>
                    <p>
                      {format(parseISO(selectedReservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                      <br />
                      {formatTimeString(selectedReservation.start_time)} ~ {formatTimeString(selectedReservation.end_time)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">이용 시간</h4>
                    <p>{selectedReservation.total_hours}시간</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">결제 정보</h4>
                    <p>총 금액: {selectedReservation.total_price.toLocaleString()}원</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">예약자 정보</h4>
                    <p>{selectedReservation.customer_name || user?.user_metadata?.name || '미설정'}</p>
                  </div>
                  
                  {(selectedReservation.company_name || selectedReservation.purpose || selectedReservation.car_number) && (
                    <div>
                      <h4 className="font-semibold mb-1">추가 정보</h4>
                      {selectedReservation.company_name && (
                        <p>회사명: {selectedReservation.company_name}</p>
                      )}
                      {selectedReservation.purpose && (
                        <p>촬영 목적: {selectedReservation.purpose}</p>
                      )}
                      {selectedReservation.car_number && (
                        <p>차량 번호: {selectedReservation.car_number}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedReservation.memo && (
                    <div>
                      <h4 className="font-semibold mb-1">메모</h4>
                      <p>{selectedReservation.memo}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold mb-1">예약 일시</h4>
                    <p>{format(parseISO(selectedReservation.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</p>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  {selectedReservation && canChangeReservation(selectedReservation) && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false);
                        router.push(`/my/reservations/change/${selectedReservation.id}`);
                      }}
                    >
                      예약 변경
                    </Button>
                  )}
                  {selectedReservation && canCancelReservation(selectedReservation) && (
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setCancelingReservation(selectedReservation);
                        setIsModalOpen(false);
                        setIsCancelModalOpen(true);
                      }}
                    >
                      예약 취소
                    </Button>
                  )}
                </div>
                <Button onClick={() => setIsModalOpen(false)}>닫기</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 회원 탈퇴 확인 모달 */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>회원 탈퇴</DialogTitle>
                <DialogDescription>
                  회원 탈퇴 시 모든 정보가 삭제되며, 적립된 시간과 쿠폰도 모두 소멸됩니다.
                  정말로 탈퇴하시겠습니까?
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                <div className="form-group">
                  <Label htmlFor="password">비밀번호 확인</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="현재 비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                  취소
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '탈퇴하기'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 예약 취소 확인 모달 */}
          <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>예약 취소</DialogTitle>
                <DialogDescription>
                  정말로 예약을 취소하시겠습니까? 취소 정책에 따라 환불 금액이 달라질 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>
                  아니오
                </Button>
                <Button variant="destructive" onClick={handleCancelReservation} disabled={isCancelling}>
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      취소 중...
                    </>
                  ) : (
                    '예약 취소'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ErrorBoundary>
  );
} 