import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BookingStatus } from './StatusBadge';
import { ApiBooking } from '@/types/api';

interface MonthViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  onDateClick: (date: Date) => void;
  onBookingClick: (booking: ApiBooking) => void;
}

const MAX_VISIBLE_BOOKINGS = 3;

export function MonthView({ currentDate, bookings, onDateClick, onBookingClick }: MonthViewProps) {
  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, ApiBooking[]> = {};
    bookings.forEach((booking) => {
      const dateKey = booking.booking_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });
    // Sort bookings within each day by start_time
    Object.values(grouped).forEach((dayBookings) => {
      dayBookings.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return grouped;
  }, [bookings]);

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {dayNames.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(auto-fill,minmax(100px,1fr))]">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayBookings = bookingsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const hasMore = dayBookings.length > MAX_VISIBLE_BOOKINGS;

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] sm:min-h-[120px] border-b border-r border-border p-1 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                isCurrentMonth && 'bg-card hover:bg-accent/30'
              )}
              onClick={() => onDateClick(day)}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium',
                    !isCurrentMonth && 'text-muted-foreground/50',
                    isCurrentMonth && !isTodayDate && 'text-foreground',
                    isTodayDate && 'bg-primary text-primary-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Bookings */}
              <div className="space-y-0.5">
                {dayBookings.slice(0, MAX_VISIBLE_BOOKINGS).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(booking);
                    }}
                  />
                ))}
                {hasMore && (
                  <button
                    className="text-[10px] sm:text-xs text-primary hover:underline font-medium pl-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateClick(day);
                    }}
                  >
                    +{dayBookings.length - MAX_VISIBLE_BOOKINGS} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: ApiBooking;
  onClick: (e: React.MouseEvent) => void;
}

// Status-based solid colors for better text contrast
const solidStatusColors: Record<BookingStatus, string> = {
  pending: 'bg-amber-500 hover:bg-amber-600',
  confirmed: 'bg-blue-500 hover:bg-blue-600',
  completed: 'bg-emerald-500 hover:bg-emerald-600',
  cancelled: 'bg-rose-500 hover:bg-rose-600',
  no_show: 'bg-purple-500 hover:bg-purple-600',
};

function BookingCard({ booking, onClick }: BookingCardProps) {
  const time = booking.start_time.substring(0, 5);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-2 py-1.5 rounded-md transition-colors shadow-sm text-white',
        solidStatusColors[booking.status as BookingStatus] || 'bg-secondary hover:bg-secondary/80'
      )}
    >
      {/* Row 1: Time (left) + Service (right) */}
      <div className="flex justify-between items-baseline gap-1 mb-0.5">
        <span className="text-[11px] font-semibold shrink-0">{time}</span>
        <span className="text-[10px] font-medium truncate">{booking.service_name}</span>
      </div>
      {/* Row 2: Client name */}
      <div className="text-[10px] opacity-90 truncate">
        {booking.client_name}
      </div>
    </button>
  );
}
