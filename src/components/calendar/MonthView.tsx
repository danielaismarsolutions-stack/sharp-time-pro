import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
// Icons removed - using compact text-only version for month view
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MonthViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onDateClick: (date: Date) => void;
  onBookingClick: (booking: ApiBooking) => void;
}

const MAX_VISIBLE_BOOKINGS = 3;

// Predefined pastel colors for services with left border
const pastelColors = [
  { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-900', border: 'border-l-blue-500' },
  { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', text: 'text-emerald-900', border: 'border-l-emerald-500' },
  { bg: 'bg-amber-100', hover: 'hover:bg-amber-200', text: 'text-amber-900', border: 'border-l-amber-500' },
  { bg: 'bg-rose-100', hover: 'hover:bg-rose-200', text: 'text-rose-900', border: 'border-l-rose-500' },
  { bg: 'bg-violet-100', hover: 'hover:bg-violet-200', text: 'text-violet-900', border: 'border-l-violet-500' },
  { bg: 'bg-pink-100', hover: 'hover:bg-pink-200', text: 'text-pink-900', border: 'border-l-pink-500' },
  { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200', text: 'text-cyan-900', border: 'border-l-cyan-500' },
  { bg: 'bg-lime-100', hover: 'hover:bg-lime-200', text: 'text-lime-900', border: 'border-l-lime-500' },
];

// Map service colors to pastel classes
const serviceColorMap: Record<string, typeof pastelColors[0]> = {
  '#3b82f6': { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-900', border: 'border-l-blue-500' },
  '#10b981': { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', text: 'text-emerald-900', border: 'border-l-emerald-500' },
  '#f59e0b': { bg: 'bg-amber-100', hover: 'hover:bg-amber-200', text: 'text-amber-900', border: 'border-l-amber-500' },
  '#ef4444': { bg: 'bg-red-100', hover: 'hover:bg-red-200', text: 'text-red-900', border: 'border-l-red-500' },
  '#8b5cf6': { bg: 'bg-violet-100', hover: 'hover:bg-violet-200', text: 'text-violet-900', border: 'border-l-violet-500' },
  '#ec4899': { bg: 'bg-pink-100', hover: 'hover:bg-pink-200', text: 'text-pink-900', border: 'border-l-pink-500' },
  '#06b6d4': { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200', text: 'text-cyan-900', border: 'border-l-cyan-500' },
  '#84cc16': { bg: 'bg-lime-100', hover: 'hover:bg-lime-200', text: 'text-lime-900', border: 'border-l-lime-500' },
  '#6366f1': { bg: 'bg-indigo-100', hover: 'hover:bg-indigo-200', text: 'text-indigo-900', border: 'border-l-indigo-500' },
  '#14b8a6': { bg: 'bg-teal-100', hover: 'hover:bg-teal-200', text: 'text-teal-900', border: 'border-l-teal-500' },
  '#f97316': { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', text: 'text-orange-900', border: 'border-l-orange-500' },
};

// Get pastel color classes for a booking based on its service
const getServicePastelColor = (booking: ApiBooking, services: Service[]) => {
  const service = services.find(s => s.id === booking.service_id || s.name === booking.service_name);
  if (service?.color && serviceColorMap[service.color]) {
    return serviceColorMap[service.color];
  }
  const hash = (booking.service_name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

export function MonthView({ currentDate, bookings, services, onDateClick, onBookingClick }: MonthViewProps) {
  const isMobile = useIsMobile();
  
  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, ApiBooking[]> = {};
    bookings
      .filter((booking) => booking.status !== 'cancelled')
      .forEach((booking) => {
        const dateKey = booking.booking_date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(booking);
      });
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
                    <MonthBookingCard
                      key={booking.id}
                      booking={booking}
                      colorClasses={colorClasses}
                      isMobile={isMobile}
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

interface MonthBookingCardProps {
  booking: ApiBooking;
  colorClasses: { bg: string; hover: string; text: string; border: string };
  isMobile: boolean;
  onClick: (e: React.MouseEvent) => void;
}

// Get initials for mobile view
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function MonthBookingCard({ booking, colorClasses, isMobile, onClick }: MonthBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);

  // Always use compact version for month view - cells are always small
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'w-full text-left rounded border-l-2 transition-all overflow-hidden',
              'hover:brightness-95',
              isMobile ? 'px-0.5 py-0' : 'px-1 py-0.5',
              colorClasses.bg,
              colorClasses.hover,
              colorClasses.text,
              colorClasses.border
            )}
            style={{ maxHeight: isMobile ? '14px' : '20px' }}
          >
            {/* Single line: time + initials - ultra compact */}
            <div className="flex items-center gap-0.5 whitespace-nowrap overflow-hidden">
              <span className={cn(
                'font-bold leading-none truncate',
                isMobile ? 'text-[6px]' : 'text-[8px]'
              )}>
                {startTime}
              </span>
              <span className={cn(
                'font-medium leading-none truncate',
                isMobile ? 'text-[6px]' : 'text-[8px]'
              )}>
                {getInitials(booking.client_name)}
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-bold">{startTime} - {endTime}</p>
            <p className="font-semibold">{booking.client_name}</p>
            <p className="text-sm opacity-80">{booking.service_name}</p>
            {booking.barber && (
              <p className="text-sm opacity-70">Barbero: {booking.barber}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
