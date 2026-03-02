import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { supabaseBookingsApi } from '@/services/supabaseBookings';
import { useAuth } from '@/contexts/AuthContext';
import { ApiBooking } from '@/types/api';

interface UseWeeklyBookingsOptions {
  currentDate: Date;
  enabled?: boolean;
}

interface WeeklyBookingsResult {
  bookings: ApiBooking[];
  weekStart: Date;
  weekEnd: Date;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWeeklyBookings({
  currentDate,
  enabled = true,
}: UseWeeklyBookingsOptions): WeeklyBookingsResult {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bookings', 'weekly', businessId, startDate, endDate],
    queryFn: () => supabaseBookingsApi.getByDateRange(startDate, endDate),
    enabled: enabled && !!businessId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    bookings,
    weekStart,
    weekEnd,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

// Hook to group bookings by date
export function useBookingsGroupedByDate(bookings: ApiBooking[]) {
  const grouped = bookings.reduce((acc, booking) => {
    const date = booking.booking_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {} as Record<string, ApiBooking[]>);

  // Sort bookings within each day by start time
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  return grouped;
}
