"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LogOut, User, Star, Clock, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeDisplay } from "@/lib/date-utils";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Link from "next/link";

// 타입 정의
interface Service {
  id: string;
  name: string;
}

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
  service?: Service;
  company_name?: string;
  purpose?: string;
  car_number?: string;
  has_review?: boolean;
}

type FilterType = 'upcoming' | 'completed' | 'cancelled';

export default function MyPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  
  // 상태 변수들
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  // 기본 핸들러들
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const fetchReservations = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`*, service:services(id, name)`)
        .eq('customer_id', user.id)
        .order('reservation_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
      setHasError(false);
    } catch (error) {
      console.error('예약 정보 조회 실패:', error);
      toast.error("예약 정보를 불러오는 중 오류가 발생했습니다.");
      setHasError(true);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!initialDataLoaded) {
      setIsLoading(true);
      fetchReservations().finally(() => {
        setIsLoading(false);
        setInitialDataLoaded(true);
      });
    }
  }, [user, loading, initialDataLoaded, router]);

  // 로딩 화면
  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p>로그인 페이지로 이동 중...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <div className="container py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">마이페이지</h1>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
          
          <div className="text-center py-10">
            <p>마이페이지 복원 중... 기본 구조 완료</p>
            <p className="text-sm text-gray-500">예약 내역: {reservations.length}개</p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
