import { useMemo } from 'react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatusBadge, BookingStatus } from './StatusBadge';
import { ApiBooking } from '@/types/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Phone, Scissors, User } from 'lucide-react';

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
      .filter((b) => b.booking_date === dateKey && b.status !== 'cancelled')
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
  const isLarge = style.height >= 100;
  const isMedium = style.height >= 70 && style.height < 100;
  
  // Get barber first name for compact display
  const barberFirstName = booking.barber?.split(' ')[0] || '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-2 right-4 rounded-md border border-border/30 border-l-4 p-2 overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md hover:brightness-95',
        statusColors[booking.status as BookingStatus] || 'bg-secondary/50 border-l-secondary'
      )}
      style={{
        top: style.top,
        height: style.height,
      }}
    >
      {/* Row 1: Time (left) + Barber (right) */}
      <div className="flex justify-between items-center gap-1 mb-0.5">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Clock className="w-3 h-3 opacity-70" />
            <span>{startTime}-{endTime}</span>
          </div>
          {(isLarge || isMedium) && (
            <StatusBadge status={booking.status as BookingStatus} size="sm" />
          )}
        </div>
        {barberFirstName && (
          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Scissors className="w-3 h-3 opacity-70" />
            <span className="truncate max-w-[80px]">{barberFirstName}</span>
          </div>
        )}
      </div>

      {/* Row 2: Client Name */}
      <div className="flex items-center gap-1">
        <User className="w-3.5 h-3.5 opacity-70" />
        <span className="text-sm font-semibold text-foreground truncate">{booking.client_name}</span>
      </div>

      {/* Row 3: Extra details for larger cards */}
      {(isLarge || isMedium) && (
        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium">{booking.service_name}</span>
          <span className="font-semibold text-primary">€{booking.service_price}</span>
          {isLarge && booking.client_phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{booking.client_phone}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
