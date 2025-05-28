'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  X,
  Search,
  Calendar
} from 'lucide-react';

interface WebhookEvent {
  id: string;
  event_type: string;
  event_data: any;
  webhook_url: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  next_retry_at: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  notes: string | null;
}

interface WebhookStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export default function WebhooksPage() {
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingEvents, setRetryingEvents] = useState<Set<string>>(new Set());
  
  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 웹훅 이벤트 조회
  const fetchWebhookEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('웹훅 이벤트 조회 실패:', error);
        return;
      }

      if (data) {
        setWebhookEvents(data);
        calculateStats(data);
      }

    } catch (error) {
      console.error('웹훅 이벤트 조회 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 통계 계산
  const calculateStats = (events: WebhookEvent[]) => {
    const stats: WebhookStats = {
      total: events.length,
      pending: events.filter(e => e.status === 'pending').length,
      sent: events.filter(e => e.status === 'sent').length,
      failed: events.filter(e => e.status === 'failed').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
    };
    setStats(stats);
  };

  // 필터링 로직
  useEffect(() => {
    let filtered = [...webhookEvents];

    // 상태 필터
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // 이벤트 타입 필터
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.event_type === eventTypeFilter);
    }

    // 검색 쿼리 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.id.toLowerCase().includes(query) ||
        event.event_type.toLowerCase().includes(query) ||
        event.related_entity_id?.toLowerCase().includes(query) ||
        JSON.stringify(event.event_data).toLowerCase().includes(query)
      );
    }

    // 날짜 필터
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(event => 
        new Date(event.created_at) >= filterDate
      );
    }

    setFilteredEvents(filtered);
  }, [webhookEvents, statusFilter, eventTypeFilter, searchQuery, dateFilter]);

  // 개별 웹훅 재시도
  const retryWebhookEvent = async (eventId: string) => {
    try {
      setRetryingEvents(prev => new Set([...prev, eventId]));

      const response = await fetch('/api/webhooks/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      const result = await response.json();

      if (result.success) {
        // 이벤트 목록 새로고침
        await fetchWebhookEvents();
      } else {
        console.error('웹훅 재시도 실패:', result.error);
      }

    } catch (error) {
      console.error('웹훅 재시도 중 오류:', error);
    } finally {
      setRetryingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  // 배치 재시도
  const retryFailedWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks/retry-batch', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        await fetchWebhookEvents();
      } else {
        console.error('배치 재시도 실패:', result.error);
      }

    } catch (error) {
      console.error('배치 재시도 중 오류:', error);
    }
  };

  // 상태 배지 컴포넌트
  const StatusBadge = ({ status }: { status: string }) => {
    const variants = {
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      sent: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      failed: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
      cancelled: { variant: 'outline', icon: X, color: 'text-gray-600' },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon size={12} className={config.color} />
        {status === 'pending' ? '대기중' :
         status === 'sent' ? '성공' :
         status === 'failed' ? '실패' : '취소됨'}
      </Badge>
    );
  };

  // 고유 이벤트 타입 추출
  const uniqueEventTypes = [...new Set(webhookEvents.map(e => e.event_type))];

  useEffect(() => {
    fetchWebhookEvents();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8" />
          <span className="ml-2">웹훅 이벤트를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">웹훅 관리</h1>
          <p className="text-muted-foreground">웹훅 이벤트 발송 현황 및 재시도 관리</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={retryFailedWebhooks}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send size={16} />
            실패 이벤트 재시도
          </Button>
          <Button 
            onClick={fetchWebhookEvents}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">전체</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">대기중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">성공</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">실패</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">취소됨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">필터</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">상태</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="sent">성공</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
                <SelectItem value="cancelled">취소됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">이벤트 타입</label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {uniqueEventTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">기간</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="week">최근 7일</SelectItem>
                <SelectItem value="month">최근 30일</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ID, 타입, 엔터티 ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 웹훅 이벤트 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>웹훅 이벤트 ({filteredEvents.length}개)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>이벤트 타입</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>재시도</TableHead>
                  <TableHead>응답</TableHead>
                  <TableHead>연관 엔터티</TableHead>
                  <TableHead>생성일시</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">
                      {event.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {event.retry_count} / {event.max_retries}
                      </span>
                      {event.next_retry_at && (
                        <div className="text-xs text-muted-foreground">
                          다음: {format(new Date(event.next_retry_at), 'MM/dd HH:mm', { locale: ko })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.response_status && (
                        <span className={`text-sm ${
                          event.response_status >= 200 && event.response_status < 300 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {event.response_status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.related_entity_type && (
                        <div className="text-sm">
                          <div>{event.related_entity_type}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {event.related_entity_id?.slice(0, 8)}...
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(event.created_at), 'MM/dd HH:mm', { locale: ko })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(event.status === 'failed' || event.status === 'pending') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryWebhookEvent(event.id)}
                            disabled={retryingEvents.has(event.id)}
                            className="h-8 px-2"
                          >
                            {retryingEvents.has(event.id) ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              필터 조건에 해당하는 웹훅 이벤트가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 