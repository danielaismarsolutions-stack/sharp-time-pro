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
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { getBarberPastelColorByName, getBarberHexColor, DEFAULT_EVENT_HEX, useBarberColorVersion } from './shared/colorUtils';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { useTheme } from '@/contexts/ThemeContext';
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
  barberNames: string[];
  onDateClick: (date: Date) => void;
  onBookingClick: (booking: ApiBooking) => void;
  getEventsForDay?: (date: Date) => ApiCalendarEvent[];
  onEventClick?: (event: ApiCalendarEvent) => void;
}

const MAX_VISIBLE_BOOKINGS = 3;

export function MonthView({ currentDate, bookings, services, barberNames, onDateClick, onBookingClick, getEventsForDay, onEventClick }: MonthViewProps) {
  const isMobile = useIsMobile();
  // Subscribe to color overrides so the view re-renders when an admin
  // changes a barber's color (the inline getBarberPastelColorByName calls
  // below already read the latest state).
  useBarberColorVersion();
  
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
          const dayEvents = getEventsForDay ? getEventsForDay(day) : [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          // Merge bookings and events into a single sorted list
          type DayItem =
            | { type: 'booking'; data: ApiBooking }
            | { type: 'event'; data: ApiCalendarEvent };

          const items: DayItem[] = [
            ...dayBookings.map((b) => ({ type: 'booking' as const, data: b })),
            ...dayEvents.map((e) => ({ type: 'event' as const, data: e })),
          ].sort((a, b) => {
            const timeA = a.type === 'booking' ? a.data.start_time : a.data.start_time;
            const timeB = b.type === 'booking' ? b.data.start_time : b.data.start_time;
            return timeA.localeCompare(timeB);
          });

          const hasMore = items.length > MAX_VISIBLE_BOOKINGS;

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

              {/* Bookings & Events - no gaps between cards */}
              <div className="flex flex-col">
                {items.slice(0, MAX_VISIBLE_BOOKINGS).map((item) => {
                  if (item.type === 'booking') {
                    const colorClasses = getBarberPastelColorByName(item.data.barber);
                    return (
                      <MonthBookingCard
                        key={item.data.id}
                        booking={item.data}
                        colorClasses={colorClasses}
                        isMobile={isMobile}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick(item.data);
                        }}
                      />
                    );
                  }
                  return (
                    <MonthEventCard
                      key={item.data.id}
                      event={item.data}
                      isMobile={isMobile}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(item.data);
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
                    +{items.length - MAX_VISIBLE_BOOKINGS} más
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
  const staffTerms = useStaffTerms();
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
              'w-full text-left rounded-sm border-l-2 transition-all overflow-hidden',
              'hover:brightness-95',
              // No vertical padding - fully compact
              isMobile ? 'px-0.5' : 'px-1',
              colorClasses.bg,
              colorClasses.hover,
              colorClasses.text,
              colorClasses.border
            )}
            style={{ height: isMobile ? '12px' : '16px' }}
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
              <p className="text-sm opacity-70">{staffTerms.singularCap}: {booking.barber}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MonthEventCardProps {
  event: ApiCalendarEvent;
  isMobile: boolean;
  onClick: (e: React.MouseEvent) => void;
}

function MonthEventCard({ event, isMobile, onClick }: MonthEventCardProps) {
  const staffTerms = useStaffTerms();
  const { theme } = useTheme();
  const startTime = event.start_time.substring(0, 5);
  const endTime = event.end_time.substring(0, 5);
  const eventHex = event.color
    || (event.barber ? getBarberHexColor(event.barber) : DEFAULT_EVENT_HEX);
  // The tinted background reads light in light mode and dark in dark mode, so
  // darken the text for contrast on light and lighten it on dark.
  const eventTextColor = theme === 'dark' ? '#f3f4f6' : darkenColor(eventHex);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'w-full text-left rounded-sm border-l-2 transition-all overflow-hidden',
              'hover:brightness-95',
              isMobile ? 'px-0.5' : 'px-1',
            )}
            style={{
              height: isMobile ? '12px' : '16px',
              backgroundColor: `${eventHex}40`,
              borderLeftColor: eventHex,
            }}
          >
            <div className="flex items-center gap-0.5 whitespace-nowrap overflow-hidden">
              <span className={cn(
                'font-bold leading-none truncate',
                isMobile ? 'text-[6px]' : 'text-[8px]'
              )}
              style={{ color: eventTextColor }}
              >
                {startTime}
              </span>
              <span className={cn(
                'font-medium leading-none truncate',
                isMobile ? 'text-[6px]' : 'text-[8px]'
              )}
              style={{ color: eventTextColor }}
              >
                {event.name.length > 6 ? event.name.substring(0, 6) + '…' : event.name}
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-bold">{startTime} - {endTime}</p>
            <p className="font-semibold">{event.name}</p>
            {event.location && (
              <p className="text-sm opacity-80">{event.location}</p>
            )}
            {event.barber && (
              <p className="text-sm opacity-70">{staffTerms.singularCap}: {event.barber}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Darken a hex color for text contrast against its light background
function darkenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 0.4;
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}
