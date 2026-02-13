import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
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
import { CurrentTimeIndicator } from './CurrentTimeIndicator';

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

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 - 22:00
const START_HOUR = 7;
const END_HOUR = 23;

// Number of days to render in the scrollable buffer
const BUFFER_DAYS_BEFORE = 3;
const BUFFER_DAYS_AFTER = 5;
const TOTAL_BUFFER = BUFFER_DAYS_BEFORE + 1 + BUFFER_DAYS_AFTER; // 9 days

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const initialScrollDone = useRef(false);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate buffer of days centered around currentDate
  const allDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = -BUFFER_DAYS_BEFORE; i <= BUFFER_DAYS_AFTER; i++) {
      days.push(addDays(currentDate, i));
    }
    return days;
  }, [currentDate]);

  // Get bookings for a specific day
  const getBookingsForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings
      .filter((b) => b.booking_date === dateStr && b.status !== 'cancelled')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [bookings]);

  // Format time for display
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Current time position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return null;
    return ((hours - START_HOUR) + minutes / 60) * hourHeight;
  }, [currentTime, hourHeight]);

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

  // Sync header scroll with body scroll
  const handleBodyScroll = useCallback(() => {
    if (isScrolling.current) return;
    isScrolling.current = true;
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  }, []);

  // Scroll to show currentDate group on mount
  useEffect(() => {
    if (initialScrollDone.current) return;
    // Scroll so currentDate (at index BUFFER_DAYS_BEFORE) is the first visible day
    const scrollToDay = () => {
      if (!bodyScrollRef.current) return;
      const container = bodyScrollRef.current;
      // Each day is 1/3 of the container visible width
      const dayWidth = container.clientWidth / 3;
      const scrollPos = BUFFER_DAYS_BEFORE * dayWidth;
      container.scrollLeft = scrollPos;
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollPos;
      }
      initialScrollDone.current = true;
    };
    // Small delay to ensure layout is computed
    requestAnimationFrame(scrollToDay);
  }, []);

  // Reset scroll when currentDate changes
  useEffect(() => {
    initialScrollDone.current = false;
    requestAnimationFrame(() => {
      if (!bodyScrollRef.current) return;
      const dayWidth = bodyScrollRef.current.clientWidth / 3;
      const scrollPos = BUFFER_DAYS_BEFORE * dayWidth;
      bodyScrollRef.current.scrollLeft = scrollPos;
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollPos;
      }
      initialScrollDone.current = true;
    });
  }, [currentDate]);

  // Detect when user scrolls near edges and load more days
  const handleScrollEnd = useCallback(() => {
    if (!bodyScrollRef.current) return;
    const container = bodyScrollRef.current;
    const dayWidth = container.clientWidth / 3;
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;

    // If scrolled more than 2 days to the right of center
    if (scrollLeft > (BUFFER_DAYS_BEFORE + 2) * dayWidth) {
      onDateChange(addDays(currentDate, 3));
    }
    // If scrolled more than 2 days to the left of center
    else if (scrollLeft < (BUFFER_DAYS_BEFORE - 2) * dayWidth) {
      onDateChange(subDays(currentDate, 3));
    }
  }, [currentDate, onDateChange]);

  // Debounced scroll end detection
  const scrollTimeoutRef = useRef<number>();
  const handleScroll = useCallback(() => {
    handleBodyScroll();
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(handleScrollEnd, 150);
  }, [handleBodyScroll, handleScrollEnd]);

  // Each day column width = 33.333% of container (so 3 days fill viewport)
  const dayWidthPercent = 100 / 3;
  const totalWidthPercent = TOTAL_BUFFER * dayWidthPercent;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Day headers - horizontally scrollable, synced with body */}
      <div className="flex border-b shrink-0" style={{ borderColor: '#e0e0e0', backgroundColor: '#ffffff' }}>
        {/* Time column spacer */}
        <div className="w-12 shrink-0" style={{ borderRight: '1px solid #e0e0e0' }} />
        {/* Scrollable header */}
        <div
          ref={headerScrollRef}
          className="flex-1 overflow-hidden"
        >
          <div className="flex" style={{ width: `${totalWidthPercent}%` }}>
            {allDays.map((day) => {
              const dayIsToday = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="py-1.5 flex items-center justify-center gap-1.5"
                  style={{ width: `${100 / TOTAL_BUFFER}%`, borderRight: '1px solid #e0e0e0' }}
                >
                  <span className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium shrink-0',
                    dayIsToday ? 'bg-foreground text-background' : 'text-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                  <span className={cn(
                    'text-sm truncate',
                    dayIsToday ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {format(day, 'EEE', { locale: es })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable body: time labels + day columns */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Legend overlay - no background, floats over grid */}
        {legendRows.length > 0 && (
          <div className="absolute left-12 right-0 top-0 flex justify-center pointer-events-none px-2 z-30 pt-1">
            <div className="rounded-b-xl px-4 py-1 max-w-full pointer-events-auto">
              <div className="flex flex-col items-center gap-0.5">
                {legendRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-center gap-3">
                    {row.map(({ name, colors }) => (
                      <div key={name} className="flex items-center gap-1">
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', colors.bg)} />
                        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Fixed time labels column */}
        <div className="w-12 shrink-0 relative overflow-y-auto overflow-x-hidden" style={{ borderRight: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}>
          {HOURS.map((hour) => (
            <div key={hour} className="relative" style={{ height: hourHeight }}>
              {hour !== START_HOUR && (
                <span
                  className="absolute right-2 text-[11px] text-muted-foreground font-normal leading-none"
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

          {/* Current time label */}
          {currentTimePosition !== null && allDays.some(d => isToday(d)) && (
            <div
              className="absolute z-30 flex items-center justify-end pointer-events-none"
              style={{
                top: currentTimePosition,
                transform: 'translateY(-50%)',
                left: 0,
                right: 0,
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

        {/* Horizontally scrollable day columns */}
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          <div className="flex" style={{ width: `${totalWidthPercent}%`, minHeight: '100%' }}>
            {allDays.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const dayIsToday = isToday(day);
              const dateStr = format(day, 'yyyy-MM-dd');

              return (
                <div
                  key={day.toISOString()}
                  className="relative"
                  style={{
                    width: `${100 / TOTAL_BUFFER}%`,
                    borderRight: '1px solid #e0e0e0',
                    backgroundColor: dayIsToday ? '#fafafa' : '#f8f8f8',
                  }}
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
                      <div
                        className="absolute inset-0"
                        onClick={() => onSlotClick(day, `${hour.toString().padStart(2, '0')}:00`)}
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

                  {/* Current time indicator */}
                  {dayIsToday && currentTimePosition !== null && (
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
