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

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00 - 23:00
const START_HOUR = 7;
const END_HOUR = 23;
const BUSINESS_START = 9;
const BUSINESS_END = 21;

export function ThreeDayView({
  currentDate,
  bookings,
  services,
  onDateChange,
  onBookingClick,
  onSlotClick,
  hourHeight = 140,
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

  // Format time for display (12-hour format like "1PM", "2PM")
  const formatHour = (hour: number) => {
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}${hour < 12 ? 'AM' : 'PM'}`;
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
      className="flex flex-col flex-1 overflow-hidden"
      style={{ backgroundColor: '#f5f5f5' }}
      {...swipeHandlers}
    >
      {/* Column Headers */}
      <div className="flex border-b bg-white sticky top-0 z-10" style={{ borderColor: '#e0e0e0' }}>
        {/* Time column spacer */}
        <div className="w-12 shrink-0" style={{ borderRight: '1px solid #e0e0e0' }} />
        
        {/* Day columns */}
        {days.map((day) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5"
              style={{ borderRight: '1px solid #e0e0e0' }}
            >
              <span className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium',
                dayIsToday ? 'bg-foreground text-background' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </span>
              <span className={cn(
                'text-sm',
                dayIsToday ? 'text-foreground font-medium' : 'text-muted-foreground'
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
          <div className="w-12 shrink-0 bg-white" style={{ borderRight: '1px solid #e0e0e0' }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative"
                style={{ height: hourHeight }}
              >
                <span 
                  className="absolute -top-2 right-2 text-[11px] text-gray-400 font-normal"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const dayIsToday = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative"
                style={{ 
                  borderRight: '1px solid #e0e0e0',
                  backgroundColor: dayIsToday ? '#fafafa' : '#f8f8f8'
                }}
                onClick={(e) => handleSlotClick(day, e)}
                onMouseDown={(e) => handleMouseDown(day, e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Hour grid lines with half-hour subdivisions */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="relative"
                    style={{ height: hourHeight }}
                  >
                    {/* Full hour line */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{ backgroundColor: '#e0e0e0' }}
                    />
                    {/* Half hour line */}
                    <div 
                      className="absolute left-0 right-0 h-px"
                      style={{ 
                        top: hourHeight / 2, 
                        backgroundColor: '#ebebeb' 
                      }}
                    />
                  </div>
                ))}

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
              {/* Time label - positioned in the time column */}
              <div
                className="absolute z-30 flex items-center justify-end"
                style={{ 
                  top: currentTimePosition, 
                  transform: 'translateY(-50%)',
                  left: 0,
                  width: '48px',
                  paddingRight: '4px'
                }}
              >
                <span 
                  className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-sm"
                  style={{ 
                    backgroundColor: '#1a1a1a',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  {format(currentTime, 'H:mm')}
                </span>
              </div>
              
              {/* Dot and line - starts after time column */}
              <div
                className="absolute z-20 flex items-center pointer-events-none"
                style={{ 
                  top: currentTimePosition,
                  left: '48px',
                  right: 0
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: '#1a1a1a', marginLeft: '-4px' }}
                />
                <div 
                  className="flex-1"
                  style={{ height: '1.5px', backgroundColor: '#1a1a1a' }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
