import { useMemo } from 'react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatusBadge, BookingStatus } from './StatusBadge';
import { ApiBooking } from '@/types/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Scissors, Euro, User } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  onBookingClick: (booking: ApiBooking) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
const HOUR_HEIGHT = 80; // pixels per hour - larger for day view

export function DayView({ currentDate, bookings, onBookingClick }: DayViewProps) {
  // Filter bookings for this day
  const dayBookings = useMemo(() => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    return bookings
      .filter((b) => b.booking_date === dateKey)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [currentDate, bookings]);

  // Calculate booking position and height
  const getBookingStyle = (booking: ApiBooking) => {
    const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
    const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);

    const top = (startHour - 8) * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT;
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 60); // Minimum 60px height

    return { top, height };
  };

  return (
    <div className="flex h-full">
      {/* Time Grid */}
      <ScrollArea className="flex-1">
        <div className="flex min-w-[600px]">
          {/* Time Labels */}
          <div className="w-20 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] flex items-start justify-end pr-3 pt-1"
              >
                <span className="text-sm text-muted-foreground font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Main Column */}
          <div className="flex-1 relative border-l border-border">
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] border-b border-border/50 relative"
              >
                {/* 30-minute line */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/30" />
              </div>
            ))}

            {/* Bookings */}
            {dayBookings.map((booking) => {
              const style = getBookingStyle(booking);
              return (
                <DayBookingCard
                  key={booking.id}
                  booking={booking}
                  style={style}
                  onClick={() => onBookingClick(booking)}
                />
              );
            })}

            {/* Empty state */}
            {dayBookings.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">Sin citas</p>
                  <p className="text-sm">No hay reservas para este día</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface DayBookingCardProps {
  booking: ApiBooking;
  style: { top: number; height: number };
  onClick: () => void;
}

// Status-based colors for consistency
const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-amber-500/15 border-l-amber-400 hover:bg-amber-500/25',
  confirmed: 'bg-blue-500/15 border-l-blue-400 hover:bg-blue-500/25',
  completed: 'bg-emerald-500/15 border-l-emerald-400 hover:bg-emerald-500/25',
  cancelled: 'bg-rose-500/15 border-l-rose-400 hover:bg-rose-500/25',
  no_show: 'bg-purple-500/15 border-l-purple-400 hover:bg-purple-500/25',
};

function DayBookingCard({ booking, style, onClick }: DayBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const isLarge = style.height >= 80;
  const isMedium = style.height >= 60 && style.height < 80;

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-2 right-4 rounded-lg border border-border/30 border-l-4 p-3 overflow-hidden transition-all cursor-pointer hover:shadow-lg hover:scale-[1.005]',
        statusColors[booking.status as BookingStatus] || 'bg-secondary/50 border-l-secondary'
      )}
      style={{
        top: style.top,
        height: style.height,
      }}
    >
      {/* Header - Always visible */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground">
            {startTime} - {endTime}
          </span>
          <StatusBadge status={booking.status as BookingStatus} size="sm" />
        </div>
        <span className="text-sm font-semibold text-primary">€{booking.service_price}</span>
      </div>

      {/* Main Info - Always visible */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{booking.client_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{booking.service_name}</span>
        </div>
      </div>

      {/* Extra details for larger cards */}
      {(isLarge || isMedium) && (
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{booking.client_phone}</span>
          </div>
          {booking.barber && (
            <span className="text-xs text-muted-foreground">
              Barbero: <span className="font-medium">{booking.barber}</span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}
