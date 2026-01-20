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
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Scissors, User } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onBookingClick: (booking: ApiBooking) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
const HOUR_HEIGHT = 60; // pixels per hour

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

export function WeekView({ currentDate, bookings, services, onBookingClick }: WeekViewProps) {
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
                  const colorClasses = getServicePastelColor(booking, services);
                  return (
                    <WeekBookingCard
                      key={booking.id}
                      booking={booking}
                      style={style}
                      colorClasses={colorClasses}
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
  colorClasses: { bg: string; hover: string; text: string };
  onClick: () => void;
}

// Adaptive text sizing based on card height
const getAdaptiveStyles = (height: number, total: number = 1) => {
  // For overlapping bookings, use more compact styling
  if (total >= 4) {
    return {
      timeSize: 'text-[7px]',
      barberSize: 'text-[7px]',
      clientSize: 'text-[8px]',
      iconSize: 'w-2 h-2',
      clientIconSize: 'w-2.5 h-2.5',
      padding: 'p-1',
      gap: 'gap-0.5',
      showBarber: false,
      showClient: height > 25,
    };
  }
  if (total === 3) {
    return {
      timeSize: 'text-[8px]',
      barberSize: 'text-[8px]',
      clientSize: 'text-[9px]',
      iconSize: 'w-2 h-2',
      clientIconSize: 'w-2.5 h-2.5',
      padding: 'p-1',
      gap: 'gap-0.5',
      showBarber: height > 35,
      showClient: height > 25,
    };
  }
  if (total === 2) {
    return {
      timeSize: 'text-[9px]',
      barberSize: 'text-[9px]',
      clientSize: 'text-[10px]',
      iconSize: 'w-2.5 h-2.5',
      clientIconSize: 'w-3 h-3',
      padding: 'p-1.5',
      gap: 'gap-0.5',
      showBarber: height > 40,
      showClient: height > 25,
    };
  }
  
  // Single booking - full layout
  if (height >= 50) {
    return {
      timeSize: 'text-xs',
      barberSize: 'text-xs',
      clientSize: 'text-sm',
      iconSize: 'w-3 h-3',
      clientIconSize: 'w-3.5 h-3.5',
      padding: 'p-1.5',
      gap: 'gap-1',
      showBarber: true,
      showClient: true,
    };
  } else if (height >= 40) {
    return {
      timeSize: 'text-[10px]',
      barberSize: 'text-[10px]',
      clientSize: 'text-[11px]',
      iconSize: 'w-2.5 h-2.5',
      clientIconSize: 'w-3 h-3',
      padding: 'p-1',
      gap: 'gap-0.5',
      showBarber: true,
      showClient: true,
    };
  } else if (height >= 30) {
    return {
      timeSize: 'text-[9px]',
      barberSize: 'text-[9px]',
      clientSize: 'text-[10px]',
      iconSize: 'w-2 h-2',
      clientIconSize: 'w-2.5 h-2.5',
      padding: 'p-1',
      gap: 'gap-0.5',
      showBarber: false,
      showClient: true,
    };
  } else {
    return {
      timeSize: 'text-[8px]',
      barberSize: 'text-[8px]',
      clientSize: 'text-[9px]',
      iconSize: 'w-2 h-2',
      clientIconSize: 'w-2.5 h-2.5',
      padding: 'p-0.5',
      gap: 'gap-0.5',
      showBarber: false,
      showClient: height > 20,
    };
  }
};

function WeekBookingCard({ booking, style, colorClasses, onClick }: WeekBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const styles = getAdaptiveStyles(style.height);
  
  // Get barber first name for compact display
  const barberFirstName = booking.barber?.split(' ')[0] || '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-0.5 right-0.5 rounded-md overflow-hidden transition-all duration-200 cursor-pointer text-left flex flex-col',
        'hover:shadow-md hover:brightness-95',
        styles.padding,
        colorClasses.bg,
        colorClasses.text
      )}
      style={{
        top: style.top,
        height: style.height,
      }}
    >
      {/* Row 1: Time (left) + Barber (right) */}
      <div className={cn("flex justify-between items-center", styles.gap)}>
        <div className={cn("flex items-center gap-0.5 font-medium shrink-0", styles.timeSize)}>
          <Clock className={cn(styles.iconSize, "shrink-0 opacity-80")} />
          <span className="leading-none">{startTime}-{endTime}</span>
        </div>
        {styles.showBarber && barberFirstName && (
          <div className={cn("flex items-center gap-0.5 font-medium truncate", styles.barberSize)}>
            <Scissors className={cn(styles.iconSize, "shrink-0 opacity-80")} />
            <span className="truncate leading-none">{barberFirstName}</span>
          </div>
        )}
      </div>
      
      {/* Row 2: Client Name */}
      {styles.showClient && (
        <div className={cn("flex items-center gap-0.5 mt-0.5", styles.clientSize)}>
          <User className={cn(styles.clientIconSize, "shrink-0 opacity-80")} />
          <span className="font-semibold truncate leading-none">{booking.client_name}</span>
        </div>
      )}
    </button>
  );
}
