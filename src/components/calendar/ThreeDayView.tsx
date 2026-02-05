import { useState, useMemo, useRef, useCallback } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { getServicePastelColor, getOverlapInfo, getBookingPosition } from '@/components/calendar/shared';
import { BookingCard } from '@/components/calendar/shared/BookingCard';

interface ThreeDayViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: ApiBooking) => void;
  onSlotClick: (date: Date, time: string) => void;
  hourHeight?: number;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
const START_HOUR = 8;
const END_HOUR = 20;
const BUSINESS_START = 9;
const BUSINESS_END = 19;

export function ThreeDayView({
  currentDate,
  bookings,
  services,
  onDateChange,
  onBookingClick,
  onSlotClick,
  hourHeight = 80,
}: ThreeDayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<{ date: Date; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Update current time every minute
  useState(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  });

  // Get 3 consecutive days starting from currentDate
  const days = useMemo(() => {
    return [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)];
  }, [currentDate]);

  // Swipe handlers for navigation
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => onDateChange(addDays(currentDate, 3)),
    onSwipeRight: () => onDateChange(addDays(currentDate, -3)),
  });

  // Get bookings for a specific day
  const getBookingsForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings
      .filter((b) => b.booking_date === dateStr && b.status !== 'cancelled')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [bookings]);

  // Calculate Y position to time
  const yToTime = useCallback((y: number): string => {
    const hourFloat = START_HOUR + (y / hourHeight);
    const hours = Math.floor(hourFloat);
    const minutes = Math.round((hourFloat - hours) * 60 / 15) * 15;
    const adjustedMinutes = minutes >= 60 ? 0 : minutes;
    const adjustedHours = minutes >= 60 ? hours + 1 : hours;
    return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
  }, [hourHeight]);

  // Handle slot click
  const handleSlotClick = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = yToTime(y);
    onSlotClick(date, time);
  };

  // Handle drag selection start
  const handleMouseDown = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelectionStart({ date, y });
    setSelectionEnd(y);
    setIsDragging(true);
  };

  // Handle drag selection move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectionStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelectionEnd(y);
  };

  // Handle drag selection end
  const handleMouseUp = () => {
    if (isDragging && selectionStart && selectionEnd !== null) {
      const startTime = yToTime(Math.min(selectionStart.y, selectionEnd));
      const endTime = yToTime(Math.max(selectionStart.y, selectionEnd));
      if (startTime !== endTime) {
        onSlotClick(selectionStart.date, startTime);
      }
    }
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsDragging(false);
  };

  // Current time position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return null;
    return ((hours - START_HOUR) + minutes / 60) * hourHeight;
  }, [currentTime, hourHeight]);

  // Check if current time indicator should show
  const showCurrentTime = useMemo(() => {
    return days.some(day => isToday(day)) && currentTimePosition !== null;
  }, [days, currentTimePosition]);

  // Format time for display
  const formatHour = (hour: number) => {
    return `${hour}${hour < 12 ? 'AM' : 'PM'}`;
  };

  // Get selection box style
  const getSelectionStyle = () => {
    if (!selectionStart || selectionEnd === null) return null;
    const top = Math.min(selectionStart.y, selectionEnd);
    const height = Math.abs(selectionEnd - selectionStart.y);
    return { top, height };
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col flex-1 overflow-hidden bg-background"
      {...swipeHandlers}
    >
      {/* Column Headers */}
      <div className="flex border-b border-border bg-card sticky top-0 z-10">
        {/* Time column spacer */}
        <div className="w-14 shrink-0 border-r border-border" />
        
        {/* Day columns */}
        {days.map((day) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex-1 py-3 text-center border-r border-border last:border-r-0',
                dayIsToday && 'bg-primary/5'
              )}
            >
              <span className={cn(
                'text-sm font-medium',
                dayIsToday ? 'text-primary' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </span>
              <span className={cn(
                'text-sm ml-1',
                dayIsToday ? 'text-primary' : 'text-muted-foreground'
              )}>
                {format(day, 'EEE', { locale: es })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative">
          {/* Time labels column */}
          <div className="w-10 shrink-0 border-r border-border">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-border"
                style={{ height: hourHeight }}
              >
                <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground">
                  {hour}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const dayIsToday = isToday(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 relative border-r border-border last:border-r-0',
                  dayIsToday && 'bg-primary/5'
                )}
                onClick={(e) => handleSlotClick(day, e)}
                onMouseDown={(e) => handleMouseDown(day, e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => {
                  const isNonBusiness = hour < BUSINESS_START || hour >= BUSINESS_END;
                  return (
                    <div
                      key={hour}
                      className={cn(
                        'border-b border-border',
                        isNonBusiness && 'bg-muted/30',
                        isWeekend && 'bg-muted/20'
                      )}
                      style={{ height: hourHeight }}
                    />
                  );
                })}

                {/* Bookings */}
                {dayBookings.map((booking) => {
                  const style = getBookingPosition(booking, hourHeight);
                  const overlapInfo = getOverlapInfo(dayBookings, booking);
                  const colorClasses = getServicePastelColor(booking, services);
                  
                  const leftCalc = `calc(${(overlapInfo.index / overlapInfo.total) * 100}% + 2px)`;
                  const widthCalc = `calc(${100 / overlapInfo.total}% - 4px)`;

                  return (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      style={{
                        top: style.top,
                        height: style.height,
                        left: leftCalc,
                        width: widthCalc,
                      }}
                      colorClasses={colorClasses}
                      overlapInfo={overlapInfo}
                      onClick={() => onBookingClick(booking)}
                      isDraggable={false}
                      viewMode="day"
                      isMobile={true}
                    />
                  );
                })}

                {/* Selection overlay */}
                {isDragging && selectionStart && isSameDay(selectionStart.date, day) && getSelectionStyle() && (
                  <div
                    className="absolute left-1 right-1 bg-primary/20 border-2 border-primary border-dashed rounded-md z-20 pointer-events-none"
                    style={getSelectionStyle()!}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
                      {yToTime(Math.min(selectionStart.y, selectionEnd!))} - {yToTime(Math.max(selectionStart.y, selectionEnd!))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Current time indicator */}
          {showCurrentTime && currentTimePosition !== null && (
            <>
              {/* Time label */}
              <div
                className="absolute left-1 z-30 flex items-center"
                style={{ top: currentTimePosition, transform: 'translateY(-50%)' }}
              >
                <span className="text-[11px] font-bold text-white bg-black px-1.5 py-0.5 rounded font-mono tracking-tight">
                  {format(currentTime, 'H:mm')}
                </span>
              </div>
              
              {/* Black dot and line */}
              <div
                className="absolute left-10 right-0 z-20 flex items-center pointer-events-none"
                style={{ top: currentTimePosition }}
              >
                <div className="w-2 h-2 rounded-full bg-black -ml-1 shrink-0" />
                <div className="flex-1 h-0.5 bg-black" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
