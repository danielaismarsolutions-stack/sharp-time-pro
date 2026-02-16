import { useMemo } from 'react';
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  differenceInMinutes,
  parse,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Scissors, User } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';

interface WeekViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onBookingClick: (booking: ApiBooking) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00
const HOUR_HEIGHT = 60; // pixels per hour

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

export function WeekView({ currentDate, bookings, services, onBookingClick }: WeekViewProps) {
  // Generate week days (Monday - Sunday)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
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
    return grouped;
  }, [bookings]);

  // Calculate booking position and height
  const getBookingStyle = (booking: ApiBooking) => {
    const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
    const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);

    const top = (startHour * HOUR_HEIGHT) + ((startMinute / 60) * HOUR_HEIGHT);
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
            <div className={cn('text-lg font-semibold', isToday(day) && 'text-primary')}>
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
              <div key={hour} className="h-[60px] flex items-start justify-end pr-2 pt-0.5">
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
                  'flex-1 relative border-l border-border min-w-[100px]',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div key={hour} className="h-[60px] border-b border-border/50 relative">
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/30" />
                  </div>
                ))}

                {/* Current time indicator - only on today's column */}
                {isToday(day) && (
                  <CurrentTimeIndicator
                    currentDate={day}
                    startHour={0}
                    endHour={23}
                    hourHeight={HOUR_HEIGHT}
                  />
                )}

                {/* Bookings */}
                {dayBookings.map((booking) => {
                  const style = getBookingStyle(booking);
                  const colorClasses = getServicePastelColor(booking, services);
                  const overlapInfo = getOverlapInfo(dayBookings, booking);
                  return (
                    <WeekBookingCard
                      key={booking.id}
                      booking={booking}
                      style={style}
                      colorClasses={colorClasses}
                      overlapInfo={overlapInfo}
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
  colorClasses: { bg: string; hover: string; text: string; border: string };
  overlapInfo: { total: number; index: number };
  onClick: () => void;
}

// Adaptive text sizing based on card height and overlaps
const getAdaptiveStyles = (height: number, total: number) => {
  const isCompact = total >= 3 || height < 40;
  const isVeryCompact = total >= 4 || height < 30;
  
  if (isVeryCompact) {
    return {
      timeSize: 'text-[7px]',
      clientSize: 'text-[8px]',
      iconSize: 'w-2 h-2',
      padding: 'px-1 py-0.5',
      showBarber: false,
      showClient: height > 25,
      showTimeRange: false,
    };
  }
  
  if (isCompact) {
    return {
      timeSize: 'text-[9px]',
      clientSize: 'text-[10px]',
      iconSize: 'w-2.5 h-2.5',
      padding: 'px-1.5 py-1',
      showBarber: height > 45 && total <= 2,
      showClient: true,
      showTimeRange: height > 35,
    };
  }
  
  if (total === 2) {
    return {
      timeSize: 'text-[10px]',
      clientSize: 'text-[11px]',
      iconSize: 'w-2.5 h-2.5',
      padding: 'px-1.5 py-1',
      showBarber: height > 50,
      showClient: true,
      showTimeRange: true,
    };
  }
  
  // Full layout
  return {
    timeSize: 'text-xs',
    clientSize: 'text-sm',
    iconSize: 'w-3 h-3',
    padding: 'px-2 py-1.5',
    showBarber: height >= 50,
    showClient: true,
    showTimeRange: true,
  };
};

// Get client initials
const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

function WeekBookingCard({ booking, style, colorClasses, overlapInfo, onClick }: WeekBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const adaptiveStyles = getAdaptiveStyles(style.height, overlapInfo.total);
  const barberFirstName = booking.barber?.split(' ')[0] || '';
  
  const { total, index } = overlapInfo;
  const widthPercent = 100 / total;
  const leftPercent = index * widthPercent;
  const showTooltip = total >= 3 || widthPercent < 50;
  
  const cardContent = (
    <button
      onClick={onClick}
      className={cn(
        // New design: rounded corners, left border, shadow
        'absolute rounded-lg border border-border/40 border-l-4 overflow-hidden',
        'transition-all duration-200 cursor-pointer text-left flex flex-col justify-start',
        // Shadow for depth
        'shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:shadow-md',
        'hover:brightness-95 hover:scale-[1.01]',
        adaptiveStyles.padding,
        colorClasses.bg,
        colorClasses.text,
        colorClasses.border
      )}
      style={{
        top: style.top,
        height: style.height,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
        minWidth: 40,
      }}
    >
      {/* Row 1: Time (bold) + Barber */}
      <div className={cn("flex justify-between items-center gap-0.5 w-full", adaptiveStyles.timeSize)}>
        <div className="flex items-center gap-0.5 font-bold shrink-0">
          <Clock className={cn(adaptiveStyles.iconSize, "shrink-0 opacity-70")} />
          <span className="leading-none whitespace-nowrap">
            {adaptiveStyles.showTimeRange ? `${startTime}-${endTime}` : startTime}
          </span>
        </div>
        {adaptiveStyles.showBarber && barberFirstName && (
          <div className="flex items-center gap-0.5 font-medium truncate">
            <Scissors className={cn(adaptiveStyles.iconSize, "shrink-0 opacity-70")} />
            <span className="truncate leading-none">{barberFirstName}</span>
          </div>
        )}
      </div>
      
      {/* Row 2: Client Name */}
      {adaptiveStyles.showClient && (
        <div className={cn("flex items-center gap-0.5 mt-0.5 w-full", adaptiveStyles.clientSize)}>
          <User className={cn(adaptiveStyles.iconSize, "shrink-0 opacity-70")} />
          <span className="font-semibold truncate leading-none">
            {widthPercent < 40 ? getInitials(booking.client_name) : booking.client_name}
          </span>
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
