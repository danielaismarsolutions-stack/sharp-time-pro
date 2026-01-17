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
import { StatusDot, BookingStatus } from './StatusBadge';
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

function WeekBookingCard({ booking, style, onClick }: WeekBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);

  // Status-based colors
  const statusColors: Record<BookingStatus, string> = {
    pending: 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30',
    confirmed: 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30',
    completed: 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30',
    cancelled: 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30',
    no_show: 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-1 right-1 rounded-md border px-1.5 py-1 overflow-hidden transition-colors cursor-pointer',
        statusColors[booking.status as BookingStatus] || 'bg-secondary/50 border-border'
      )}
      style={{
        top: style.top,
        height: style.height,
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <StatusDot status={booking.status as BookingStatus} size="sm" />
        <span className="text-[10px] font-medium">{startTime}</span>
      </div>
      <div className="text-[10px] font-medium truncate">{booking.client_name}</div>
      {style.height > 40 && (
        <div className="text-[9px] text-muted-foreground truncate">{booking.service_name}</div>
      )}
    </button>
  );
}
