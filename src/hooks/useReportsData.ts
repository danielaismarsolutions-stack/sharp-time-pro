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
import { supabaseBookingsApi } from '@/services/supabaseBookings';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { supabaseClientsApi } from '@/services/supabaseClients';
import { supabase } from '@/lib/supabase';
import { BUSINESS_ID } from '@/config/api';
import { ApiBooking } from '@/types/api';
import { Barber } from '@/types/barber';

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
  serviceBreakdown: Array<{ name: string; revenue: number }>;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  busiestHours: Array<{ hour: string; bookings: number }>;
  topClients: Array<{ name: string; revenue: number; visits: number }>;
  barberMetrics: BarberMetric[];
}

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

function filterBookings(bookings: ApiBooking[]): ApiBooking[] {
  return bookings.filter(b => b.booking_type !== 'event');
}

function buildRevenueTrend(
  bookings: ApiBooking[],
  period: Period,
  startDate: Date,
  endDate: Date,
): Array<{ label: string; revenue: number; bookings: number }> {
  const completed = bookings.filter(b => b.status === 'completed');

  switch (period) {
    case 'week': {
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(startDate, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayBookings = completed.filter(b => b.booking_date === dayStr);
        return {
          label: format(day, 'EEE', { locale: es }),
          revenue: dayBookings.reduce((sum, b) => sum + Number(b.service_price), 0),
          bookings: dayBookings.length,
        };
      });
    }
    case 'month': {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayBookings = completed.filter(b => b.booking_date === dayStr);
        return {
          label: format(day, 'd'),
          revenue: dayBookings.reduce((sum, b) => sum + Number(b.service_price), 0),
          bookings: dayBookings.length,
        };
      });
    }
    case 'quarter': {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekBookings = completed.filter(b => {
          const d = new Date(b.booking_date);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          label: format(weekStart, 'd MMM', { locale: es }),
          revenue: weekBookings.reduce((sum, b) => sum + Number(b.service_price), 0),
          bookings: weekBookings.length,
        };
      });
    }
    case 'year': {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(startDate.getFullYear(), i, 1);
        const monthEnd = endOfMonth(monthStart);
        const monthBookings = completed.filter(b => {
          const d = new Date(b.booking_date);
          return d >= monthStart && d <= monthEnd;
        });
        return {
          label: format(monthStart, 'MMM', { locale: es }),
          revenue: monthBookings.reduce((sum, b) => sum + Number(b.service_price), 0),
          bookings: monthBookings.length,
        };
      });
    }
  }
}

function computeBarberMetrics(bookings: ApiBooking[], barbers: Barber[]): BarberMetric[] {
  const totalRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.service_price), 0);

  const grouped = bookings.reduce((acc, b) => {
    const name = b.barber || 'Sin asignar';
    if (!acc[name]) acc[name] = [];
    acc[name].push(b);
    return acc;
  }, {} as Record<string, ApiBooking[]>);

  return Object.entries(grouped).map(([name, bks]) => {
    const completed = bks.filter(b => b.status === 'completed');
    const revenue = completed.reduce((sum, b) => sum + Number(b.service_price), 0);

    // Match barber record by user_id first, then by name
    const sampleUserId = bks.find(b => b.user_id)?.user_id;
    const barberRecord = barbers.find(br => br.id === sampleUserId) ||
      barbers.find(br => br.name === name);

    // Top service
    const serviceCounts = completed.reduce((acc, b) => {
      const sn = b.service_name || 'Sin servicio';
      acc[sn] = (acc[sn] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topEntry = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      barberName: barberRecord?.name || name,
      barberId: barberRecord?.id || null,
      avatarUrl: barberRecord?.avatar_url || null,
      revenue,
      revenueShare: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      bookingsCount: bks.length,
      completedCount: completed.length,
      cancelledCount: bks.filter(b => b.status === 'cancelled').length,
      noShowCount: bks.filter(b => b.status === 'no_show').length,
      completionRate: bks.length > 0 ? Math.round((completed.length / bks.length) * 100) : 0,
      avgBookingValue: completed.length > 0 ? Math.round(revenue / completed.length) : 0,
      topService: topEntry?.[0] || '-',
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

function computeTopClients(bookings: ApiBooking[], limit = 5) {
  const completed = bookings.filter(b => b.status === 'completed');
  const clientMap = new Map<string, { name: string; revenue: number; visits: number }>();

  for (const b of completed) {
    const key = b.client_id || b.client_name;
    const existing = clientMap.get(key);
    if (existing) {
      existing.revenue += Number(b.service_price);
      existing.visits += 1;
    } else {
      clientMap.set(key, { name: b.client_name, revenue: Number(b.service_price), visits: 1 });
    }
  }

  return Array.from(clientMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function useReportsData(period: Period) {
  const queryClient = useQueryClient();
  const { current, previous, currentStartDate, currentEndDate } = useMemo(() => getDateRanges(period), [period]);

  const { data: rawCurrentBookings = [], isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['reports', 'bookings', 'current', current.start, current.end],
    queryFn: () => supabaseBookingsApi.getAll({ start_date: current.start, end_date: current.end }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: rawPreviousBookings = [], isLoading: isLoadingPrevious } = useQuery({
    queryKey: ['reports', 'bookings', 'previous', previous.start, previous.end],
    queryFn: () => supabaseBookingsApi.getAll({ start_date: previous.start, end_date: previous.end }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: barbers = [] } = useQuery({
    queryKey: ['reports', 'barbers'],
    queryFn: () => supabaseBarbersApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  // Real-time subscription + polling fallback
  useEffect(() => {
    const channelName = `reports-bookings-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `business_id=eq.${BUSINESS_ID}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reports', 'bookings'] });
        },
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'bookings'] });
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const analytics = useMemo((): ReportsAnalytics => {
    const bookings = filterBookings(rawCurrentBookings);
    const prevBookings = filterBookings(rawPreviousBookings);

    const completed = bookings.filter(b => b.status === 'completed');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    const noShow = bookings.filter(b => b.status === 'no_show');
    const prevCompleted = prevBookings.filter(b => b.status === 'completed');

    const totalRevenue = completed.reduce((sum, b) => sum + Number(b.service_price), 0);
    const prevRevenue = prevCompleted.reduce((sum, b) => sum + Number(b.service_price), 0);
    const revenueChg = computeChange(totalRevenue, prevRevenue);

    const bookingsChg = computeChange(bookings.length, prevBookings.length);

    const completionRate = bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0;
    const prevCompletionRate = prevBookings.length > 0
      ? Math.round((prevCompleted.length / prevBookings.length) * 100) : 0;
    const rateDiff = completionRate - prevCompletionRate;

    const avgPerBooking = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
    const prevAvg = prevCompleted.length > 0
      ? Math.round(prevRevenue / prevCompleted.length) : 0;
    const avgChg = computeChange(avgPerBooking, prevAvg);

    // Unique clients in the period
    const uniqueClients = new Set(completed.map(b => b.client_id || b.client_name)).size;

    // Revenue by service
    const serviceMap = completed.reduce((acc, b) => {
      const name = b.service_name || 'Sin servicio';
      acc[name] = (acc[name] || 0) + Number(b.service_price);
      return acc;
    }, {} as Record<string, number>);
    const serviceBreakdown = Object.entries(serviceMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Status distribution
    const statusDistribution = [
      { name: 'Completadas', value: completed.length, color: '#10b981' },
      { name: 'Pendientes', value: bookings.filter(b => b.status === 'pending').length, color: '#f59e0b' },
      { name: 'Confirmadas', value: bookings.filter(b => b.status === 'confirmed').length, color: '#3b82f6' },
      { name: 'Canceladas', value: cancelled.length, color: '#ef4444' },
      { name: 'No asistió', value: noShow.length, color: '#6b7280' },
    ].filter(d => d.value > 0);

    // Busiest hours
    const hourCounts = bookings.reduce((acc, b) => {
      const hour = parseInt(b.start_time.split(':')[0]);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const busiestHours = Array.from({ length: 12 }, (_, i) => ({
      hour: `${i + 8}:00`,
      bookings: hourCounts[i + 8] || 0,
    }));

    return {
      kpis: {
        revenue: { value: totalRevenue, ...revenueChg },
        bookingsCount: { value: bookings.length, completed: completed.length, ...bookingsChg },
        completionRate: {
          value: completionRate,
          noShowCount: noShow.length,
          change: Math.abs(rateDiff),
          direction: rateDiff > 0 ? 'up' : rateDiff < 0 ? 'down' : 'neutral',
        },
        avgPerBooking: { value: avgPerBooking, uniqueClients, ...avgChg },
      },
      revenueTrend: buildRevenueTrend(bookings, period, currentStartDate, currentEndDate),
      serviceBreakdown,
      statusDistribution,
      busiestHours,
      topClients: computeTopClients(bookings),
      barberMetrics: computeBarberMetrics(bookings, barbers),
    };
  }, [rawCurrentBookings, rawPreviousBookings, barbers, period, currentStartDate, currentEndDate]);

  return {
    analytics,
    isLoading: isLoadingCurrent || isLoadingPrevious,
  };
}
