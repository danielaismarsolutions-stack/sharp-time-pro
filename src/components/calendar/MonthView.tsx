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
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';

interface MonthViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onDateClick: (date: Date) => void;
  onBookingClick: (booking: ApiBooking) => void;
}

const MAX_VISIBLE_BOOKINGS = 3;

// Predefined pastel colors for services
const pastelColors = [
  { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
  { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
  { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
  { bg: 'bg-rose-200', hover: 'hover:bg-rose-300', text: 'text-rose-900' },
  { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
  { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
  { bg: 'bg-cyan-200', hover: 'hover:bg-cyan-300', text: 'text-cyan-900' },
  { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
];

// Map service colors to pastel classes
const serviceColorMap: Record<string, { bg: string; hover: string; text: string }> = {
  '#3b82f6': { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
  '#10b981': { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
  '#f59e0b': { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
  '#ef4444': { bg: 'bg-red-200', hover: 'hover:bg-red-300', text: 'text-red-900' },
  '#8b5cf6': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
  '#ec4899': { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
  '#06b6d4': { bg: 'bg-cyan-200', hover: 'hover:bg-cyan-300', text: 'text-cyan-900' },
  '#84cc16': { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
  '#6366f1': { bg: 'bg-indigo-200', hover: 'hover:bg-indigo-300', text: 'text-indigo-900' },
  '#14b8a6': { bg: 'bg-teal-200', hover: 'hover:bg-teal-300', text: 'text-teal-900' },
  '#f97316': { bg: 'bg-orange-200', hover: 'hover:bg-orange-300', text: 'text-orange-900' },
};

// Get pastel color classes for a booking based on its service
const getServicePastelColor = (booking: ApiBooking, services: Service[]) => {
  const service = services.find(s => s.id === booking.service_id || s.name === booking.service_name);
  if (service?.color && serviceColorMap[service.color]) {
    return serviceColorMap[service.color];
  }
  // Fallback: use hash of service name to pick a consistent color
  const hash = (booking.service_name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

export function MonthView({ currentDate, bookings, services, onDateClick, onBookingClick }: MonthViewProps) {
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
                {dayBookings.slice(0, MAX_VISIBLE_BOOKINGS).map((booking) => {
                  const colorClasses = getServicePastelColor(booking, services);
                  return (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      colorClasses={colorClasses}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(booking);
                      }}
                    />
                  );
                })}
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
  colorClasses: { bg: string; hover: string; text: string };
  onClick: (e: React.MouseEvent) => void;
}

function BookingCard({ booking, colorClasses, onClick }: BookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-1.5 py-1 rounded-md transition-colors shadow-sm',
        colorClasses.bg,
        colorClasses.hover,
        colorClasses.text
      )}
    >
      {/* Row 1: Time range + Price */}
      <div className="flex justify-between items-baseline gap-0.5">
        <span className="text-[9px] font-semibold shrink-0">
          {startTime}-{endTime}
        </span>
        <span className="text-[9px] font-bold shrink-0">
          €{booking.service_price}
        </span>
      </div>
      {/* Row 2: Client name */}
      <div className="text-[9px] font-medium truncate">
        {booking.client_name}
      </div>
    </button>
  );
}
