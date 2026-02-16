import { useMemo, useState, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { ThreeDayCarousel } from './ThreeDayCarousel';
import { TimeColumn, ThreeDayHeader, ThreeDayLegendOverlay, ThreeDayContent } from './three-day';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSelecting, setIsSelecting] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  });

  // Filter bookings for a period (3 days starting from periodStart)
  const getBookingsForPeriod = useCallback((periodStart: Date) => {
    const periodEnd = addDays(periodStart, 2);
    return bookings.filter(b => {
      const bookingDate = new Date(b.booking_date);
      return bookingDate >= periodStart && bookingDate <= periodEnd;
    });
  }, [bookings]);

  // Current time position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < START_HOUR || hours >= END_HOUR) return null;
    return ((hours - START_HOUR) + minutes / 60) * hourHeight;
  }, [currentTime, hourHeight]);

  // Check if current time indicator should show
  const showCurrentTime = useMemo(() => {
    return currentTimePosition !== null;
  }, [currentTimePosition]);

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="flex flex-1">
        {/* Time column - stays fixed outside carousel */}
        <TimeColumn
          hours={HOURS}
          currentTime={currentTime}
          hourHeight={hourHeight}
          showCurrentTime={showCurrentTime}
          currentTimePosition={currentTimePosition}
        />

        {/* Carousel container with header and content */}
        <ThreeDayCarousel
          currentDate={currentDate}
          onDateChange={onDateChange}
          isDragging={isDragging}
          isSelecting={isSelecting}
        >
          {(periodStartDate) => {
            const days = [periodStartDate, addDays(periodStartDate, 1), addDays(periodStartDate, 2)];
            const periodBookings = getBookingsForPeriod(periodStartDate);

            return (
              <div className="flex flex-col flex-1">
                {/* Sticky header */}
                <div className="sticky top-0 z-40 bg-white relative">
                  <ThreeDayHeader days={days} />
                  <ThreeDayLegendOverlay barberNames={barberNames} />
                </div>

                {/* Scrollable content */}
                <ThreeDayContent
                  days={days}
                  bookings={periodBookings}
                  services={services}
                  hourHeight={hourHeight}
                  onBookingClick={onBookingClick}
                  onSlotClick={onSlotClick}
                  isDragging={isDragging}
                  dropPreview={dropPreview}
                  businessOpenHour={businessOpenHour}
                  businessCloseHour={businessCloseHour}
                  draggedBookingDuration={draggedBookingDuration}
                  draggedBookingClientName={draggedBookingClientName}
                  draggedBookingServiceName={draggedBookingServiceName}
                  draggedBookingColorClasses={draggedBookingColorClasses}
                  pendingMoveBookingId={pendingMoveBookingId}
                  events={events}
                  getEventsForDay={getEventsForDayProp}
                  onEventClick={onEventClick}
                  currentTimePosition={currentTimePosition}
                  onSelectionChange={setIsSelecting}
                />
              </div>
            );
          }}
        </ThreeDayCarousel>
      </div>
    </div>
  );
}
