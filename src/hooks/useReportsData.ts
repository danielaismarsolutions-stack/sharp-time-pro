import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  eachDayOfInterval,
  eachWeekOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { useBarbers } from '@/hooks/useQueryHooks';
import { useBusinessBrand, type RevenueRecognitionMode } from '@/contexts/BusinessBrandContext';

// ── Public types (consumed by Reports.tsx, KpiCards, BarberPerformance) ──

export type Period = 'week' | 'month' | 'quarter' | 'year';

export interface KpiData {
  value: number;
  change: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface BarberMetric {
  barberName: string;
  barberId: string | null;
  avatarUrl: string | null;
  revenue: number;
  revenueShare: number;
  bookingsCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  completionRate: number;
  avgBookingValue: number;
  topService: string;
}

export interface ReportsAnalytics {
  kpis: {
    revenue: KpiData;
    bookingsCount: KpiData & { completed: number };
    completionRate: KpiData & { noShowCount: number };
    avgPerBooking: KpiData & { uniqueClients: number };
  };
  revenueTrend: Array<{ label: string; revenue: number; bookings: number }>;
  /** Cobrado vs Generado — only meaningful for 'paid_at' businesses. */
  collectedVsEarnedTrend: Array<{ label: string; collected: number; earned: number }>;
  serviceBreakdown: Array<{ name: string; revenue: number }>;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  busiestHours: Array<{ hour: string; bookings: number }>;
  topClients: Array<{ name: string; revenue: number; visits: number }>;
  barberMetrics: BarberMetric[];
  paymentMethods: Array<{ method: string; label: string; count: number; revenue: number; color: string }>;
  /** Total amount of completed bookings still awaiting payment (all-time). */
  pendingRevenue: { amount: number; count: number };
  recognitionMode: RevenueRecognitionMode;
}

// ── Internal types for the RPC response ─────────────────────────────

interface RpcKpis {
  revenue: number;
  total_bookings: number;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  pending_count: number;
  confirmed_count: number;
  unique_clients: number;
}

interface RpcDailyTrend {
  date: string;
  revenue: number;
  bookings: number;
}

interface RpcResult {
  kpis: RpcKpis;
  service_breakdown: Array<{ name: string; revenue: number }>;
  status_distribution: Array<{ status: string; count: number }>;
  busiest_hours: Array<{ hour: number; bookings: number }>;
  top_clients: Array<{ name: string; revenue: number; visits: number }>;
  barber_metrics: Array<{
    barber_name: string;
    user_id: string | null;
    revenue: number;
    bookings_count: number;
    completed_count: number;
    cancelled_count: number;
    no_show_count: number;
    top_service: string | null;
  }>;
  daily_trend: RpcDailyTrend[];
  earned_trend?: RpcDailyTrend[];
  pending_revenue?: { amount: number; count: number };
  recognition_mode?: RevenueRecognitionMode;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getDateRanges(period: Period) {
  const now = new Date();
  let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;

  switch (period) {
    case 'week':
      currentStart = startOfWeek(now, { weekStartsOn: 1 });
      currentEnd = endOfWeek(now, { weekStartsOn: 1 });
      prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case 'month':
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
      break;
    case 'quarter':
      currentStart = startOfQuarter(now);
      currentEnd = endOfQuarter(now);
      prevStart = startOfQuarter(subQuarters(now, 1));
      prevEnd = endOfQuarter(subQuarters(now, 1));
      break;
    case 'year':
      currentStart = startOfYear(now);
      currentEnd = endOfYear(now);
      prevStart = startOfYear(subYears(now, 1));
      prevEnd = endOfYear(subYears(now, 1));
      break;
  }

  return {
    current: { start: format(currentStart, 'yyyy-MM-dd'), end: format(currentEnd, 'yyyy-MM-dd') },
    previous: { start: format(prevStart, 'yyyy-MM-dd'), end: format(prevEnd, 'yyyy-MM-dd') },
    currentStartDate: currentStart,
    currentEndDate: currentEnd,
  };
}

function computeChange(current: number, previous: number): { change: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0 && current === 0) return { change: 0, direction: 'neutral' };
  if (previous === 0) return { change: 100, direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { change: Math.abs(pct), direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' };
}

async function fetchReportAggregations(businessId: string, startDate: string, endDate: string): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('get_report_aggregations', {
    p_business_id: businessId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data as RpcResult;
}

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; color: string }> = {
  cash: { label: 'Efectivo', color: '#10b981' },
  card: { label: 'Tarjeta', color: '#3b82f6' },
  bizum: { label: 'Bizum', color: '#8b5cf6' },
  unpaid: { label: 'Sin cobrar', color: '#6b7280' },
};

async function fetchPaymentMethodDistribution(
  businessId: string,
  startDate: string,
  endDate: string,
  mode: RevenueRecognitionMode,
): Promise<Array<{ method: string; count: number; revenue: number }>> {
  // For 'paid_at' businesses, restrict to actually-paid bookings whose payment
  // landed inside the period. The 'unpaid' bucket is therefore omitted in this
  // mode — pending revenue is surfaced separately via pending_revenue.
  let query = supabase
    .from('bookings')
    .select('payment_status, payment_method, service_price, paid_at')
    .eq('business_id', businessId)
    .eq('booking_type', 'booking');

  if (mode === 'paid_at') {
    query = query
      .eq('payment_status', 'paid')
      .gte('paid_at', `${startDate}T00:00:00`)
      .lt('paid_at', `${endDate}T23:59:59.999`);
  } else {
    query = query
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .in('status', ['completed', 'confirmed', 'pending']);
  }

  const { data, error } = await query;
  if (error) throw error;

  const grouped = new Map<string, { count: number; revenue: number }>();
  for (const row of data ?? []) {
    const key = row.payment_status === 'paid' && row.payment_method
      ? row.payment_method
      : 'unpaid';
    const entry = grouped.get(key) || { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(row.service_price ?? 0);
    grouped.set(key, entry);
  }

  return Array.from(grouped.entries()).map(([method, data]) => ({
    method,
    ...data,
  }));
}

const STATUS_LABELS: Record<string, { name: string; color: string }> = {
  completed: { name: 'Completadas', color: '#10b981' },
  pending: { name: 'Pendientes', color: '#f59e0b' },
  confirmed: { name: 'Confirmadas', color: '#3b82f6' },
  cancelled: { name: 'Canceladas', color: '#ef4444' },
  no_show: { name: 'No asistió', color: '#6b7280' },
};

/** Build revenue trend from daily aggregates returned by the RPC */
function buildRevenueTrend(
  dailyTrend: RpcDailyTrend[],
  period: Period,
  startDate: Date,
  endDate: Date,
): Array<{ label: string; revenue: number; bookings: number }> {
  const dailyMap = new Map(dailyTrend.map(d => [d.date, d]));

  switch (period) {
    case 'week': {
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(startDate, i);
        const entry = dailyMap.get(format(day, 'yyyy-MM-dd'));
        return {
          label: format(day, 'EEE', { locale: es }),
          revenue: Number(entry?.revenue ?? 0),
          bookings: entry?.bookings ?? 0,
        };
      });
    }
    case 'month': {
      return eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
        const entry = dailyMap.get(format(day, 'yyyy-MM-dd'));
        return {
          label: format(day, 'd'),
          revenue: Number(entry?.revenue ?? 0),
          bookings: entry?.bookings ?? 0,
        };
      });
    }
    case 'quarter': {
      return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }).map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        let revenue = 0;
        let bookings = 0;
        for (const [dateStr, entry] of dailyMap) {
          const d = new Date(dateStr);
          if (d >= weekStart && d <= weekEnd) {
            revenue += Number(entry.revenue);
            bookings += entry.bookings;
          }
        }
        return { label: format(weekStart, 'd MMM', { locale: es }), revenue, bookings };
      });
    }
    case 'year': {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(startDate.getFullYear(), i, 1);
        const monthEnd = endOfMonth(monthStart);
        let revenue = 0;
        let bookings = 0;
        for (const [dateStr, entry] of dailyMap) {
          const d = new Date(dateStr);
          if (d >= monthStart && d <= monthEnd) {
            revenue += Number(entry.revenue);
            bookings += entry.bookings;
          }
        }
        return { label: format(monthStart, 'MMM', { locale: es }), revenue, bookings };
      });
    }
  }
}

// ── Empty analytics (used while loading) ────────────────────────────

const EMPTY_ANALYTICS: ReportsAnalytics = {
  kpis: {
    revenue: { value: 0, change: 0, direction: 'neutral' },
    bookingsCount: { value: 0, completed: 0, change: 0, direction: 'neutral' },
    completionRate: { value: 0, noShowCount: 0, change: 0, direction: 'neutral' },
    avgPerBooking: { value: 0, uniqueClients: 0, change: 0, direction: 'neutral' },
  },
  revenueTrend: [],
  collectedVsEarnedTrend: [],
  serviceBreakdown: [],
  statusDistribution: [],
  busiestHours: [],
  topClients: [],
  barberMetrics: [],
  paymentMethods: [],
  pendingRevenue: { amount: 0, count: 0 },
  recognitionMode: 'booking_date',
};

// ── Hook ────────────────────────────────────────────────────────────

export function useReportsData(period: Period) {
  const queryClient = useQueryClient();
  const { current, previous, currentStartDate, currentEndDate } = useMemo(() => getDateRanges(period), [period]);
  const businessId = getBusinessId();
  const { brand } = useBusinessBrand();
  const recognitionMode: RevenueRecognitionMode = brand.revenueRecognitionMode;

  // Server-side aggregations — returns ~2-3KB instead of MBs of raw bookings
  const { data: currentAgg, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['reports', 'aggregations', 'current', current.start, current.end],
    queryFn: () => fetchReportAggregations(businessId, current.start, current.end),
    staleTime: 1000 * 60 * 2,
  });

  const { data: previousAgg, isLoading: isLoadingPrevious } = useQuery({
    queryKey: ['reports', 'aggregations', 'previous', previous.start, previous.end],
    queryFn: () => fetchReportAggregations(businessId, previous.start, previous.end),
    staleTime: 1000 * 60 * 2,
  });

  // Payment method distribution (lightweight client-side aggregation).
  // Mode is part of the key so caches don't collide if the mode flips.
  const { data: paymentMethodsRaw } = useQuery({
    queryKey: ['reports', 'payment-methods', current.start, current.end, recognitionMode],
    queryFn: () => fetchPaymentMethodDistribution(businessId, current.start, current.end, recognitionMode),
    staleTime: 1000 * 60 * 2,
  });

  // Barbers list — only needed for avatar/name enrichment (lightweight, cached)
  const { data: barbers = [] } = useBarbers();

  // Real-time subscription + polling fallback
  useEffect(() => {
    const bookingsChannel = supabase
      .channel(`reports-bookings-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `business_id=eq.${businessId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reports', 'aggregations'] });
        },
      )
      .subscribe();

    const usersChannel = supabase
      .channel(`reports-users-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `business_id=eq.${businessId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['barbers'] });
        },
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'aggregations'] });
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [queryClient, businessId]);

  // Transform RPC result → ReportsAnalytics (the shape consumed by all components)
  const analytics = useMemo((): ReportsAnalytics => {
    const cur = currentAgg?.kpis;
    if (!cur) return EMPTY_ANALYTICS;

    const prev = previousAgg?.kpis;

    // KPIs with period-over-period comparison
    const totalRevenue = Number(cur.revenue);
    const prevRevenue = prev ? Number(prev.revenue) : 0;
    const revenueChg = computeChange(totalRevenue, prevRevenue);

    const totalBookings = cur.total_bookings;
    const prevTotalBookings = prev?.total_bookings ?? 0;
    const bookingsChg = computeChange(totalBookings, prevTotalBookings);

    const completionRate = totalBookings > 0 ? Math.round((cur.completed_count / totalBookings) * 100) : 0;
    const prevCompletionRate = prevTotalBookings > 0
      ? Math.round(((prev?.completed_count ?? 0) / prevTotalBookings) * 100) : 0;
    const rateDiff = completionRate - prevCompletionRate;

    const avgPerBooking = cur.completed_count > 0 ? Math.round(totalRevenue / cur.completed_count) : 0;
    const prevAvg = (prev?.completed_count ?? 0) > 0
      ? Math.round(prevRevenue / (prev?.completed_count ?? 1)) : 0;
    const avgChg = computeChange(avgPerBooking, prevAvg);

    // Status distribution
    const statusDistribution = (currentAgg?.status_distribution ?? [])
      .map(s => {
        const label = STATUS_LABELS[s.status];
        return label ? { name: label.name, value: s.count, color: label.color } : null;
      })
      .filter((d): d is { name: string; value: number; color: string } => d !== null && d.value > 0);

    // Busiest hours
    const busiestHours = (currentAgg?.busiest_hours ?? []).map(h => ({
      hour: `${h.hour}:00`,
      bookings: h.bookings,
    }));

    // Top clients
    const topClients = (currentAgg?.top_clients ?? []).map(c => ({
      name: c.name,
      revenue: Number(c.revenue),
      visits: c.visits,
    }));

    // Service breakdown
    const serviceBreakdown = (currentAgg?.service_breakdown ?? []).map(s => ({
      name: s.name,
      revenue: Number(s.revenue),
    }));

    // Barber metrics — enrich with avatar/name from the barbers list
    const rpcBarbers = currentAgg?.barber_metrics ?? [];
    const totalBarberRevenue = rpcBarbers.reduce((sum, b) => sum + Number(b.revenue), 0);

    const barberMetrics: BarberMetric[] = rpcBarbers.map(b => {
      const revenue = Number(b.revenue);
      const barberRecord = barbers.find(br => br.id === b.user_id) ||
        barbers.find(br => br.name === b.barber_name);

      return {
        barberName: barberRecord?.name || b.barber_name,
        barberId: barberRecord?.id || null,
        avatarUrl: barberRecord?.avatar_url || null,
        revenue,
        revenueShare: totalBarberRevenue > 0 ? Math.round((revenue / totalBarberRevenue) * 100) : 0,
        bookingsCount: b.bookings_count,
        completedCount: b.completed_count,
        cancelledCount: b.cancelled_count,
        noShowCount: b.no_show_count,
        completionRate: b.bookings_count > 0 ? Math.round((b.completed_count / b.bookings_count) * 100) : 0,
        avgBookingValue: b.completed_count > 0 ? Math.round(revenue / b.completed_count) : 0,
        topService: b.top_service || '-',
      };
    });

    // Revenue trend (uses the recognition date by mode, computed server-side).
    const revenueTrend = buildRevenueTrend(
      currentAgg?.daily_trend ?? [],
      period,
      currentStartDate,
      currentEndDate,
    );

    // Collected vs earned trend (paid_at mode only — for booking_date the two
    // series are identical so the chart adds no information).
    const earnedTrendBuilt = buildRevenueTrend(
      currentAgg?.earned_trend ?? [],
      period,
      currentStartDate,
      currentEndDate,
    );
    const collectedVsEarnedTrend = revenueTrend.map((row, idx) => ({
      label: row.label,
      collected: row.revenue,
      earned: earnedTrendBuilt[idx]?.revenue ?? 0,
    }));

    // Payment methods
    const paymentMethods = (paymentMethodsRaw ?? [])
      .map(pm => {
        const config = PAYMENT_METHOD_CONFIG[pm.method];
        return config ? { method: pm.method, label: config.label, count: pm.count, revenue: pm.revenue, color: config.color } : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => b.count - a.count);

    const pendingRevenue = currentAgg?.pending_revenue ?? { amount: 0, count: 0 };
    const responseMode: RevenueRecognitionMode =
      currentAgg?.recognition_mode ?? recognitionMode;

    return {
      kpis: {
        revenue: { value: totalRevenue, ...revenueChg },
        bookingsCount: { value: totalBookings, completed: cur.completed_count, ...bookingsChg },
        completionRate: {
          value: completionRate,
          noShowCount: cur.no_show_count,
          change: Math.abs(rateDiff),
          direction: rateDiff > 0 ? 'up' : rateDiff < 0 ? 'down' : 'neutral',
        },
        avgPerBooking: { value: avgPerBooking, uniqueClients: cur.unique_clients, ...avgChg },
      },
      revenueTrend,
      collectedVsEarnedTrend,
      serviceBreakdown,
      statusDistribution,
      busiestHours,
      topClients,
      barberMetrics,
      paymentMethods,
      pendingRevenue: {
        amount: Number(pendingRevenue.amount ?? 0),
        count: Number(pendingRevenue.count ?? 0),
      },
      recognitionMode: responseMode,
    };
  }, [currentAgg, previousAgg, barbers, period, currentStartDate, currentEndDate, paymentMethodsRaw, recognitionMode]);

  return {
    analytics,
    isLoading: isLoadingCurrent || isLoadingPrevious,
  };
}
