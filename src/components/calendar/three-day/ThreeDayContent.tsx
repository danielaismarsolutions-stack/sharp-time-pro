import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';
import { getServicePastelColor, getOverlapInfo, getBookingPosition, getEventPosition } from '@/components/calendar/shared';
import { BookingCard } from '@/components/calendar/shared/BookingCard';
import { EventCard } from '@/components/calendar/shared/EventCard';
import { DroppableTimeSlotEnhanced } from '@/components/calendar/shared/DroppableTimeSlotEnhanced';
import { isWithinBusinessHours } from '@/hooks/useCalendarDragDropEnhanced';

interface DropPreview {
  date: string;
  time: string;
  hasConflict: boolean;
  conflictingBookings: string[];
  scheduleError?: string;
}

interface ThreeDayContentProps {
  days: Date[];
  bookings: ApiBooking[];
  services: Service[];
  hourHeight: number;
  onBookingClick: (booking: ApiBooking) => void;
  onSlotClick: (date: Date, time: string) => void;
  isDragging?: boolean;
  dropPreview?: DropPreview | null;
  businessOpenHour?: number;
  businessCloseHour?: number;
  draggedBookingDuration?: number;
  draggedBookingClientName?: string;
  draggedBookingServiceName?: string;
  draggedBookingColorClasses?: { bg: string; border: string; text: string };
  pendingMoveBookingId?: string;
  events?: ApiCalendarEvent[];
  getEventsForDay?: (date: Date) => ApiCalendarEvent[];
  onEventClick?: (event: ApiCalendarEvent) => void;
  currentTimePosition: number | null;
  onSelectionChange?: (isSelecting: boolean) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00 - 23:00
const START_HOUR = 7;

export function ThreeDayContent({
  days,
  bookings,
  services,
  hourHeight,
  onBookingClick,
  onSlotClick,
  isDragging = false,
  dropPreview = null,
  businessOpenHour = 9,
  businessCloseHour = 21,
  draggedBookingDuration,
  draggedBookingClientName,
  draggedBookingServiceName,
  draggedBookingColorClasses,
  pendingMoveBookingId,
  events = [],
  getEventsForDay: getEventsForDayProp,
  onEventClick,
  currentTimePosition,
  onSelectionChange,
}: ThreeDayContentProps) {
  const [selectionStart, setSelectionStart] = useState<{ date: Date; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Touch gesture tracking refs for mobile drag-to-create
  const touchStartRef = useRef<{ clientX: number; clientY: number; date: Date; gridY: number; rectTop: number } | null>(null);
  const touchModeRef = useRef<'undetermined' | 'selecting' | 'scrolling'>('undetermined');
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent when selection state changes
  useEffect(() => {
    onSelectionChange?.(isSelecting);
  }, [isSelecting, onSelectionChange]);

  // Prevent page scrolling while drag-selecting on mobile
  useEffect(() => {
    if (!isSelecting) return;
    const handler = (e: TouchEvent) => { e.preventDefault(); };
    document.addEventListener('touchmove', handler, { passive: false });
    return () => document.removeEventListener('touchmove', handler);
  }, [isSelecting]);

  // Cleanup touch timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

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

  // Handle slot click - only if not dragging a booking card
  const handleSlotClick = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (isSelecting || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = yToTime(y);
    onSlotClick(date, time);
  };

  // Handle drag selection start
  const handleMouseDown = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelectionStart({ date, y });
    setSelectionEnd(y);
    setIsSelecting(true);
  };

  // Handle drag selection move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelectionEnd(y);
  };

  // Handle drag selection end
  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd !== null) {
      const startTime = yToTime(Math.min(selectionStart.y, selectionEnd));
      const endTime = yToTime(Math.max(selectionStart.y, selectionEnd));
      if (startTime !== endTime) {
        onSlotClick(selectionStart.date, startTime);
      }
    }
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

  // Handle touch drag selection start (mobile)
  // Uses a 200ms hold delay to distinguish drag-to-create from scrolling
  const handleTouchStart = useCallback((date: Date, e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging || e.touches.length > 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    touchStartRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      date,
      gridY: touch.clientY - rect.top,
      rectTop: rect.top,
    };
    touchModeRef.current = 'undetermined';
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      if (touchStartRef.current && touchModeRef.current === 'undetermined') {
        touchModeRef.current = 'selecting';
        setSelectionStart({ date: touchStartRef.current.date, y: touchStartRef.current.gridY });
        setSelectionEnd(touchStartRef.current.gridY);
        setIsSelecting(true);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }, 200);
  }, [isDragging]);

  // Handle touch drag selection move (mobile)
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || isDragging) return;
    if (e.touches.length > 1) {
      // Multi-touch: cancel any active selection
      if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
      touchModeRef.current = 'scrolling';
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      return;
    }
    const touch = e.touches[0];
    if (touchModeRef.current === 'undetermined') {
      // If finger moves before the hold timer fires, treat as scroll
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.clientX);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.clientY);
      if (deltaX > 8 || deltaY > 8) {
        if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
        touchModeRef.current = 'scrolling';
      }
      return;
    }
    if (touchModeRef.current === 'selecting') {
      const y = touch.clientY - touchStartRef.current.rectTop;
      setSelectionEnd(y);
    }
  }, [isDragging]);

  // Handle touch drag selection end (mobile)
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
    if (touchModeRef.current === 'selecting' && selectionStart && selectionEnd !== null) {
      const startTime = yToTime(Math.min(selectionStart.y, selectionEnd));
      const endTime = yToTime(Math.max(selectionStart.y, selectionEnd));
      if (startTime !== endTime) {
        e.preventDefault(); // Prevent subsequent click event from firing
        onSlotClick(selectionStart.date, startTime);
      }
    }
    touchStartRef.current = null;
    touchModeRef.current = 'undetermined';
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [selectionStart, selectionEnd, yToTime, onSlotClick]);

  // Get selection box style
  const getSelectionStyle = () => {
    if (!selectionStart || selectionEnd === null) return null;
    const top = Math.min(selectionStart.y, selectionEnd);
    const height = Math.abs(selectionEnd - selectionStart.y);
    return { top, height };
  };

  // Check if current time indicator should show for these days
  const showCurrentTime = useMemo(() => {
    return days.some(day => isToday(day)) && currentTimePosition !== null;
  }, [days, currentTimePosition]);

  return (
    <div className="flex-1">
      <div className="flex relative">
        {/* Day columns */}
        {days.map((day) => {
          const dayBookings = getBookingsForDay(day);
          const dayIsToday = isToday(day);
          const dateStr = format(day, 'yyyy-MM-dd');

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
              onTouchStart={(e) => handleTouchStart(day, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Hour grid with DroppableTimeSlotEnhanced for drag-drop support */}
              {HOURS.map((hour) => (
                <DroppableTimeSlotEnhanced
                  key={hour}
                  id={`3day-${dateStr}-${hour}`}
                  hour={hour}
                  date={dateStr}
                  hourHeight={hourHeight}
                  isDropTarget={dropPreview?.date === dateStr && dropPreview?.time?.startsWith(hour.toString().padStart(2, '0'))}
                  previewTime={dropPreview?.date === dateStr ? dropPreview?.time : null}
                  hasConflict={dropPreview?.hasConflict}
                  scheduleError={dropPreview?.scheduleError}
                  isOutsideBusinessHours={!isWithinBusinessHours(hour, businessOpenHour, businessCloseHour)}
                  isDragging={isDragging}
                  draggedBookingDuration={draggedBookingDuration}
                  draggedBookingClientName={draggedBookingClientName}
                  draggedBookingServiceName={draggedBookingServiceName}
                  draggedBookingColorClasses={draggedBookingColorClasses}
                  className={cn(
                    'border-b-0',
                    !isDragging && 'hover:bg-muted/10'
                  )}
                >
                  {/* Full hour line at top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                    style={{ backgroundColor: '#e0e0e0' }}
                  />
                  {/* Half hour line */}
                  <div
                    className="absolute left-0 right-0 h-px pointer-events-none"
                    style={{
                      top: hourHeight / 2,
                      backgroundColor: '#ebebeb'
                    }}
                  />
                </DroppableTimeSlotEnhanced>
              ))}

              {/* Bookings - drag enabled for mobile */}
              {dayBookings.map((booking) => {
                const style = getBookingPosition(booking, hourHeight, START_HOUR);
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
                    isDraggable={true}
                    viewMode="day"
                    isMobile={true}
                    isPendingMove={pendingMoveBookingId === booking.id}
                  />
                );
              })}

              {/* Events */}
              {getEventsForDayProp && onEventClick && getEventsForDayProp(day).map((event) => {
                const evtStyle = getEventPosition(event, hourHeight, START_HOUR);
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    style={{
                      top: evtStyle.top,
                      height: evtStyle.height,
                      left: '2px',
                      width: 'calc(100% - 4px)',
                    }}
                    onClick={() => onEventClick(event)}
                    viewMode="day"
                    isMobile={true}
                  />
                );
              })}

              {/* Selection overlay */}
              {isSelecting && selectionStart && isSameDay(selectionStart.date, day) && getSelectionStyle() && (
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
          <div
            className="absolute z-20 flex items-center pointer-events-none"
            style={{
              top: currentTimePosition,
              left: 0,
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
        )}
      </div>
    </div>
  );
}
