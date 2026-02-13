import { useMemo, useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';
import { getServicePastelColor, getOverlapInfo, getBookingPosition, getEventPosition } from '@/components/calendar/shared';
import { pastelColors } from '@/components/calendar/shared/colorUtils';
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

interface ThreeDayViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: ApiBooking) => void;
  onSlotClick: (date: Date, time: string) => void;
  hourHeight?: number;
  barberNames?: string[];
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
}

const NUM_GROUPS = 7;
const CENTER_INDEX = 3;
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00 - 23:00
const START_HOUR = 7;
const END_HOUR = 23;

export function ThreeDayView({
  currentDate,
  bookings,
  services,
  onDateChange,
  onBookingClick,
  onSlotClick,
  hourHeight = 140,
  barberNames = [],
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
}: ThreeDayViewProps) {
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isRecentering = useRef(false);
  const hasInitialized = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<{ date: Date; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Touch gesture tracking refs for mobile drag-to-create
  const touchStartRef = useRef<{ clientX: number; clientY: number; date: Date; gridY: number; rectTop: number } | null>(null);
  const touchModeRef = useRef<'undetermined' | 'selecting' | 'scrolling'>('undetermined');
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  });

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

  // Generate buffer of days: NUM_GROUPS * 3 days centered on currentDate
  const allDays = useMemo(() => {
    const startDate = addDays(currentDate, -CENTER_INDEX * 3);
    return Array.from({ length: NUM_GROUPS * 3 }, (_, i) => addDays(startDate, i));
  }, [currentDate]);

  // Group into sets of 3
  const groups = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 3) {
      result.push(allDays.slice(i, i + 3));
    }
    return result;
  }, [allDays]);

  // Initialize/recenter scroll to center group
  useLayoutEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    // Use requestAnimationFrame to ensure layout is ready
    requestAnimationFrame(() => {
      const pageWidth = el.offsetWidth;
      if (pageWidth === 0) return;
      el.scrollLeft = CENTER_INDEX * pageWidth;
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = CENTER_INDEX * pageWidth;
      }
      // After first render, mark as initialized
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    });
  }, [currentDate]);

  // Sync header scroll with body scroll
  const handleBodyScroll = useCallback(() => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  }, []);

  // Detect when scroll snap completes and recenter if needed
  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;

    let scrollTimer: ReturnType<typeof setTimeout>;

    const handleScrollEnd = () => {
      if (isRecentering.current) {
        isRecentering.current = false;
        return;
      }
      const pageWidth = el.offsetWidth;
      if (pageWidth === 0) return;
      const currentIndex = Math.round(el.scrollLeft / pageWidth);
      if (currentIndex !== CENTER_INDEX) {
        const offset = (currentIndex - CENTER_INDEX) * 3;
        isRecentering.current = true;
        onDateChange(addDays(currentDate, offset));
      }
    };

    // Use debounced scroll to detect snap completion
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(handleScrollEnd, 150);
    };
    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [currentDate, onDateChange]);

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
      if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
      touchModeRef.current = 'scrolling';
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      return;
    }
    const touch = e.touches[0];
    if (touchModeRef.current === 'undetermined') {
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
        e.preventDefault();
        onSlotClick(selectionStart.date, startTime);
      }
    }
    touchStartRef.current = null;
    touchModeRef.current = 'undetermined';
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [selectionStart, selectionEnd, yToTime, onSlotClick]);

  // Current time position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return null;
    return ((hours - START_HOUR) + minutes / 60) * hourHeight;
  }, [currentTime, hourHeight]);

  // Format time for display
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

  // Barber colors for floating legend
  const barberColors = useMemo(() => {
    const sorted = [...barberNames].sort();
    return sorted.map((name, i) => ({
      name,
      colors: pastelColors[i % pastelColors.length],
    }));
  }, [barberNames]);

  const legendRows = useMemo(() => {
    if (barberColors.length === 0) return [];
    if (barberColors.length <= 3) return [barberColors];
    const firstRowCount = Math.ceil(barberColors.length / 2);
    return [
      barberColors.slice(0, firstRowCount),
      barberColors.slice(firstRowCount),
    ];
  }, [barberColors]);

  return (
    <div className="flex flex-col flex-1 relative" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Sticky header with synced horizontal scroll */}
      <div className="sticky top-0 z-40 bg-white relative">
        <div className="flex border-b" style={{ borderColor: '#e0e0e0' }}>
          {/* Time column spacer */}
          <div className="w-12 shrink-0" style={{ borderRight: '1px solid #e0e0e0' }} />

          {/* Horizontally synced day headers */}
          <div
            ref={headerScrollRef}
            className="flex-1 overflow-hidden"
          >
            <div className="flex" style={{ width: `${NUM_GROUPS * 100}%` }}>
              {groups.map((group, gi) => (
                <div key={gi} className="flex" style={{ width: `${100 / NUM_GROUPS}%` }}>
                  {group.map((day) => {
                    const dayIsToday = isToday(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className="flex-1 py-1.5 flex items-center justify-center gap-1.5"
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
              ))}
            </div>
          </div>
        </div>

        {/* Legend overlay */}
        {legendRows.length > 0 && (
          <div className="absolute left-12 right-0 top-full z-30 flex justify-center pointer-events-none pt-1.5 px-2">
            <div
              className="rounded-xl px-4 py-1.5 max-w-full pointer-events-auto"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="flex flex-col items-center gap-1">
                {legendRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-center gap-3">
                    {row.map(({ name, colors }) => (
                      <div key={name} className="flex items-center gap-1">
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', colors.bg)} />
                        <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">{name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body: fixed time labels + horizontally scrollable day columns */}
      <div className="flex-1 flex">
        {/* Fixed time labels column */}
        <div className="w-12 shrink-0 bg-white" style={{ borderRight: '1px solid #e0e0e0' }}>
          {HOURS.map((hour) => (
            <div key={hour} className="relative" style={{ height: hourHeight }}>
              {hour !== START_HOUR && (
                <span
                  className="absolute right-2 text-[11px] text-gray-400 font-normal leading-none"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    top: 0,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {formatHour(hour)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Horizontally scrollable day columns with snap */}
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-x-scroll snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
          }}
          onScroll={handleBodyScroll}
        >
          <div className="flex" style={{ width: `${NUM_GROUPS * 100}%` }}>
            {groups.map((group, gi) => (
              <div
                key={gi}
                className="flex snap-start relative"
                style={{ width: `${100 / NUM_GROUPS}%` }}
              >
                {group.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const dayIsToday = isToday(day);
                  const dateStr = format(day, 'yyyy-MM-dd');

                  return (
                    <div
                      key={day.toISOString()}
                      className="flex-1 relative"
                      style={{
                        borderRight: '1px solid #e0e0e0',
                        backgroundColor: dayIsToday ? '#fafafa' : '#f8f8f8',
                      }}
                      onClick={(e) => handleSlotClick(day, e)}
                      onMouseDown={(e) => handleMouseDown(day, e)}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onTouchStart={(e) => handleTouchStart(day, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* Hour grid */}
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
                          <div
                            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                            style={{ backgroundColor: '#e0e0e0' }}
                          />
                          <div
                            className="absolute left-0 right-0 h-px pointer-events-none"
                            style={{ top: hourHeight / 2, backgroundColor: '#ebebeb' }}
                          />
                        </DroppableTimeSlotEnhanced>
                      ))}

                      {/* Bookings */}
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

                      {/* Current time indicator */}
                      {dayIsToday && currentTimePosition !== null && (
                        <>
                          <div
                            className="absolute z-20 flex items-center pointer-events-none"
                            style={{ top: currentTimePosition, left: 0, right: 0 }}
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
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current time label in time column */}
      {currentTimePosition !== null && allDays.some(d => isToday(d)) && (
        <div
          className="absolute z-30 flex items-center justify-end pointer-events-none"
          style={{
            top: currentTimePosition,
            transform: 'translateY(-50%)',
            left: 0,
            width: '48px',
            paddingRight: '4px',
          }}
        >
          <span
            className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: '#1a1a1a',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {format(currentTime, 'H:mm')}
          </span>
        </div>
      )}
    </div>
  );
}
