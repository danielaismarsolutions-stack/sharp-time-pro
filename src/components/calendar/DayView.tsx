import { useMemo } from 'react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Phone, Scissors, User } from 'lucide-react';
import { StatusBadge, BookingStatus } from './StatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';

interface DayViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  onBookingClick: (booking: ApiBooking) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00
const HOUR_HEIGHT = 80; // pixels per hour

// Status-based colors with left border
const statusColors: Record<BookingStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: 'bg-amber-50', border: 'border-l-amber-400', text: 'text-amber-900' },
  confirmed: { bg: 'bg-blue-50', border: 'border-l-blue-400', text: 'text-blue-900' },
  completed: { bg: 'bg-emerald-50', border: 'border-l-emerald-400', text: 'text-emerald-900' },
  cancelled: { bg: 'bg-rose-50', border: 'border-l-rose-400', text: 'text-rose-900' },
  no_show: { bg: 'bg-purple-50', border: 'border-l-purple-400', text: 'text-purple-900' },
};

// Check if two bookings overlap
const doBookingsOverlap = (a: ApiBooking, b: ApiBooking) => {
  const aStart = parse(a.start_time, 'HH:mm:ss', new Date());
  const aEnd = parse(a.end_time, 'HH:mm:ss', new Date());
  const bStart = parse(b.start_time, 'HH:mm:ss', new Date());
  const bEnd = parse(b.end_time, 'HH:mm:ss', new Date());
  return aStart < bEnd && aEnd > bStart;
};

// Calculate overlap info
const getOverlapInfo = (bookings: ApiBooking[], booking: ApiBooking) => {
  const overlapping = bookings.filter(b => doBookingsOverlap(booking, b));
  overlapping.sort((a, b) => {
    const timeComp = a.start_time.localeCompare(b.start_time);
    return timeComp !== 0 ? timeComp : a.id.localeCompare(b.id);
  });
  const index = overlapping.findIndex(b => b.id === booking.id);
  return { total: overlapping.length, index };
};

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

    const top = startHour * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT;
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

            {/* Current time indicator */}
            <CurrentTimeIndicator
              currentDate={currentDate}
              startHour={0}
              endHour={23}
              hourHeight={HOUR_HEIGHT}
            />

            {/* Bookings */}
            {dayBookings.map((booking) => {
              const style = getBookingStyle(booking);
              const overlapInfo = getOverlapInfo(dayBookings, booking);
              return (
                <DayBookingCard
                  key={booking.id}
                  booking={booking}
                  style={style}
                  overlapInfo={overlapInfo}
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
  overlapInfo: { total: number; index: number };
  onClick: () => void;
}

function DayBookingCard({ booking, style, overlapInfo, onClick }: DayBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const isLarge = style.height >= 100;
  const isMedium = style.height >= 70 && style.height < 100;
  const barberFirstName = booking.barber?.split(' ')[0] || '';
  
  const { total, index } = overlapInfo;
  const widthPercent = 100 / total;
  const leftPercent = index * widthPercent;
  const showTooltip = total >= 3 || widthPercent < 50;
  
  const colors = statusColors[booking.status as BookingStatus] || statusColors.pending;

  const cardContent = (
    <button
      onClick={onClick}
      className={cn(
        // New design: rounded corners, left border, shadow
        'absolute rounded-lg border border-border/40 border-l-4 p-2 overflow-hidden',
        'transition-all duration-200 cursor-pointer text-left flex flex-col justify-start',
        // Shadow for depth
        'shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:shadow-md',
        'hover:brightness-95 hover:scale-[1.01]',
        colors.bg,
        colors.border,
        colors.text
      )}
      style={{
        top: style.top,
        height: style.height,
        left: `calc(${leftPercent}% + 8px)`,
        width: `calc(${widthPercent}% - 16px)`,
        minWidth: 80,
      }}
    >
      {/* Row 1: Time (bold) + Barber */}
      <div className="flex justify-between items-center gap-1 mb-0.5">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-bold">
            <Clock className="w-3 h-3 opacity-70" />
            <span>{startTime}-{endTime}</span>
          </div>
          {(isLarge || isMedium) && (
            <StatusBadge status={booking.status as BookingStatus} size="sm" />
          )}
        </div>
        {barberFirstName && total <= 2 && (
          <div className="flex items-center gap-1 text-xs font-medium">
            <Scissors className="w-3 h-3 opacity-70" />
            <span className="truncate max-w-[80px]">{barberFirstName}</span>
          </div>
        )}
      </div>

      {/* Row 2: Client Name */}
      <div className="flex items-center gap-1">
        <User className="w-3.5 h-3.5 opacity-70" />
        <span className="text-sm font-semibold truncate">
          {widthPercent < 40 ? booking.client_name.split(' ').map(n => n[0]).join('').slice(0, 2) : booking.client_name}
        </span>
      </div>

      {/* Row 3: Extra details for larger cards */}
      {(isLarge || isMedium) && total === 1 && (
        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs opacity-75">
          <span className="font-medium">{booking.service_name}</span>
          <span className="font-semibold">€{booking.service_price}</span>
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

  // Wrap with tooltip for narrow/overlapping cards
  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-bold">{startTime} - {endTime}</p>
              <p className="font-semibold">{booking.client_name}</p>
              <p className="text-sm opacity-80">{booking.service_name}</p>
              {booking.barber && (
                <p className="text-sm opacity-70">Barbero: {booking.barber}</p>
              )}
              <p className="text-sm font-semibold">€{booking.service_price}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}
