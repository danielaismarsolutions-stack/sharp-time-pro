import { useState, useMemo, useRef, useCallback } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useTimeSlotSelection } from '@/hooks/useTimeSlotSelection';
import { getServicePastelColor, getOverlapInfo, getBookingPosition, TimeSlotSelectionBox } from '@/components/calendar/shared';
import { BookingCard } from '@/components/calendar/shared/BookingCard';
import { NewAppointmentBottomSheet, AppointmentType } from '@/components/mobile/NewAppointmentBottomSheet';

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
  hourHeight = 100,
}: ThreeDayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: Date;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Time slot selection hook
  const {
    selection,
    containerRef: selectionContainerRef,
    getSelectionStyle,
    startSelection,
    startDraggingHandle,
    updateSelection,
    endSelection,
    completeSelection,
    cancelSelection,
  } = useTimeSlotSelection({
    hourHeight,
    startHour: START_HOUR,
    minDuration: 15,
    snapInterval: 15,
    onSelectionComplete: (date, startTime, endTime) => {
      setSelectedTimeSlot({ date, startTime, endTime });
      setIsBottomSheetOpen(true);
    },
  });

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

  // Handle pointer down to start selection
  const handlePointerDown = useCallback((date: Date, e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start selection if clicking on a booking card
    if ((e.target as HTMLElement).closest('[data-booking-card]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    startSelection(date, e.clientY, rect);
  }, [startSelection]);

  // Handle touch start for mobile
  const handleTouchStart = useCallback((date: Date, e: React.TouchEvent<HTMLDivElement>) => {
    // Don't start selection if touching a booking card
    if ((e.target as HTMLElement).closest('[data-booking-card]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    startSelection(date, touch.clientY, rect);
  }, [startSelection]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!selection?.isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    updateSelection(e.clientY, rect);
  }, [selection?.isActive, updateSelection]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!selection?.isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    updateSelection(touch.clientY, rect);
  }, [selection?.isActive, updateSelection]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    endSelection();
  }, [endSelection]);

  // Handle bottom sheet close
  const handleBottomSheetClose = useCallback(() => {
    setIsBottomSheetOpen(false);
    setSelectedTimeSlot(null);
    cancelSelection();
  }, [cancelSelection]);

  // Handle appointment type selection
  const handleAppointmentTypeSelect = useCallback((type: AppointmentType) => {
    if (selectedTimeSlot && type === 'service') {
      // Open the booking modal with selected time
      onSlotClick(selectedTimeSlot.date, selectedTimeSlot.startTime);
    }
    setIsBottomSheetOpen(false);
    setSelectedTimeSlot(null);
    cancelSelection();
  }, [selectedTimeSlot, onSlotClick, cancelSelection]);

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
                ref={isSameDay(day, selection?.date || new Date()) ? selectionContainerRef : undefined}
                className="flex-1 relative touch-none"
                style={{
                  borderRight: '1px solid #e0e0e0',
                  backgroundColor: dayIsToday ? '#fafafa' : '#f8f8f8'
                }}
                onPointerDown={(e) => handlePointerDown(day, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onTouchStart={(e) => handleTouchStart(day, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handlePointerUp}
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
                {selection && isSameDay(selection.date, day) && (
                  <TimeSlotSelectionBox
                    selection={selection}
                    style={getSelectionStyle()}
                    onStartDragHandle={startDraggingHandle}
                    onComplete={completeSelection}
                  />
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

      {/* New Appointment Bottom Sheet */}
      <NewAppointmentBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={handleBottomSheetClose}
        onSelectType={handleAppointmentTypeSelect}
        selectedTime={selectedTimeSlot || undefined}
      />
    </div>
  );
}
