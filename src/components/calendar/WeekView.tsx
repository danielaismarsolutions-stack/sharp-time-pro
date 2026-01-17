import { useMemo } from 'react';
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  isToday,
  differenceInMinutes,
  parse,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BookingStatus } from './StatusBadge';
import { ApiBooking } from '@/types/api';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WeekViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  onBookingClick: (booking: ApiBooking) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
const HOUR_HEIGHT = 60; // pixels per hour

export function WeekView({ currentDate, bookings, onBookingClick }: WeekViewProps) {
  // Generate week days (Monday - Sunday)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
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
    return grouped;
  }, [bookings]);

  // Calculate booking position and height
  const getBookingStyle = (booking: ApiBooking) => {
    const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
    const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());
    
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);
    
    const top = ((startHour - 8) * HOUR_HEIGHT) + ((startMinute / 60) * HOUR_HEIGHT);
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 30); // Minimum 30px height
    
    return { top, height };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day Headers */}
      <div className="flex border-b border-border sticky top-0 bg-card z-10">
        <div className="w-16 shrink-0" /> {/* Time column spacer */}
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'flex-1 py-2 text-center border-l border-border',
              isToday(day) && 'bg-primary/10'
            )}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {format(day, 'EEE', { locale: es })}
            </div>
            <div
              className={cn(
                'text-lg font-semibold',
                isToday(day) && 'text-primary'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <ScrollArea className="flex-1">
        <div className="flex">
          {/* Time Labels */}
          <div className="w-16 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] flex items-start justify-end pr-2 pt-0.5"
              >
                <span className="text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayBookings = bookingsByDate[dateKey] || [];

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 relative border-l border-border',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-border/50"
                  />
                ))}

                {/* Bookings */}
                {dayBookings.map((booking) => {
                  const style = getBookingStyle(booking);
                  return (
                    <WeekBookingCard
                      key={booking.id}
                      booking={booking}
                      style={style}
                      onClick={() => onBookingClick(booking)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

interface WeekBookingCardProps {
  booking: ApiBooking;
  style: { top: number; height: number };
  onClick: () => void;
}


// Status-based solid colors for better text contrast
const solidStatusColors: Record<BookingStatus, string> = {
  pending: 'bg-amber-500 hover:bg-amber-600',
  confirmed: 'bg-blue-500 hover:bg-blue-600',
  completed: 'bg-emerald-500 hover:bg-emerald-600',
  cancelled: 'bg-rose-500 hover:bg-rose-600',
  no_show: 'bg-purple-500 hover:bg-purple-600',
};

function WeekBookingCard({ booking, style, onClick }: WeekBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const isSmall = style.height < 40;

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-1 right-1 rounded-md px-2 py-1.5 overflow-hidden transition-colors cursor-pointer shadow-sm text-white text-left',
        solidStatusColors[booking.status as BookingStatus] || 'bg-secondary hover:bg-secondary/80'
      )}
      style={{
        top: style.top,
        height: style.height,
      }}
    >
      {/* Compact layout for very small cards */}
      {isSmall ? (
        <div className="flex items-center justify-between gap-2 h-full">
          <span className="text-[11px] font-semibold">{startTime}</span>
          <span className="text-[10px] font-medium truncate">{booking.client_name}</span>
        </div>
      ) : (
        <>
          {/* Row 1: Time (left) + Service (right) */}
          <div className="flex justify-between items-baseline gap-2 mb-0.5">
            <span className="text-xs font-semibold shrink-0">
              {startTime}
            </span>
            <span className="text-[11px] font-medium truncate">
              {booking.service_name}
            </span>
          </div>
          {/* Row 2: Client name */}
          <div className="text-[11px] opacity-90 truncate">
            {booking.client_name}
          </div>
        </>
      )}
    </button>
  );
}
