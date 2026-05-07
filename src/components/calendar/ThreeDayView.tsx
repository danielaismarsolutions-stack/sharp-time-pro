import { useMemo, useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useAutoScrollOnDrag } from '@/hooks/useAutoScrollOnDrag';
import { getServicePastelColor, getOverlapInfo, getUnifiedOverlapInfo, getBookingPosition, getEventPosition } from '@/components/calendar/shared';
import { getBarberPastelColorByName, useBarberColorVersion } from '@/components/calendar/shared/colorUtils';
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
  onSlotClick: (date: Date, time: string, endTime?: string) => void;
  hourHeight?: number;
  barberNames?: string[];
  isDragging?: boolean;
  dropPreview?: DropPreview | null;
  businessOpenHour?: number;
  businessCloseHour?: number;
  /** Callback to check if a given hour on a given date is closed/unavailable */
  isHourClosed?: (hour: number, date: Date) => boolean;
  /** Callback to get closed minute ranges within a partially-open hour */
  getClosedMinuteRanges?: (hour: number, date: Date) => { startMinute: number; endMinute: number }[];
  draggedBookingDuration?: number;
  draggedBookingClientName?: string;
  draggedBookingServiceName?: string;
  draggedBookingColorClasses?: { bg: string; border: string; text: string };
  pendingMoveBookingId?: string;
  pendingMoveEventId?: string;
  events?: ApiCalendarEvent[];
  getEventsForDay?: (date: Date) => ApiCalendarEvent[];
  onEventClick?: (event: ApiCalendarEvent) => void;
  /** Ref to the parent scroll container, used for auto-scroll during drag-to-create */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Whether the month picker overlay is open (hides legend + time indicator) */
  isMonthPickerOpen?: boolean;
  /** Mobile mode: render a 9-day strip with horizontal scroll-snap navigation */
  isMobile?: boolean;
}

const TIME_COL_WIDTH = 48;

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00
const START_HOUR = 0;
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
  isHourClosed,
  getClosedMinuteRanges,
  draggedBookingDuration,
  draggedBookingClientName,
  draggedBookingServiceName,
  draggedBookingColorClasses,
  pendingMoveBookingId,
  pendingMoveEventId,
  events = [],
  getEventsForDay: getEventsForDayProp,
  onEventClick,
  scrollContainerRef,
  isMonthPickerOpen = false,
  isMobile = false,
}: ThreeDayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use Madrid timezone for current time (consistent with CurrentTimeIndicator)
  const getMadridTime = () => {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  };

  const [currentTime, setCurrentTime] = useState(getMadridTime);
  const [selectionStart, setSelectionStart] = useState<{ date: Date; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Touch gesture tracking refs for mobile drag-to-create
  const touchStartRef = useRef<{ clientX: number; clientY: number; date: Date; gridY: number; rectTop: number } | null>(null);
  const touchModeRef = useRef<'undetermined' | 'selecting' | 'scrolling'>('undetermined');
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to block the click event that fires after a drag-selection mouseup
  const dragJustCompletedRef = useRef(false);
  // Refs for auto-scroll during drag-to-create: track pointer Y and active day column
  const lastPointerYRef = useRef<number>(0);
  const activeDayColumnRef = useRef<HTMLDivElement | null>(null);
  // Fallback ref when no scrollContainerRef is provided
  const fallbackScrollRef = useRef<HTMLElement | null>(null);
  const effectiveScrollRef = scrollContainerRef ?? fallbackScrollRef;

  // Update current time every minute
  useEffect(() => {
    setCurrentTime(getMadridTime());
    const interval = setInterval(() => setCurrentTime(getMadridTime()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Auto-scroll the parent container when dragging near edges during slot creation
  useAutoScrollOnDrag(effectiveScrollRef, isSelecting);

  // Auto-navigate to next/previous 3 days when dragging a booking card to the screen edges
  const edgeNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeNavCooldownRef = useRef(false);
  const edgeNavCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref mirrors isDragging so timer callbacks always see the latest value
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  // Ref mirrors currentDate so timer callbacks always see the latest value
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  // Synchronously cancel any pending edge-nav timer when drag ends (before effect cleanup)
  const prevIsDraggingRef = useRef(isDragging);
  if (prevIsDraggingRef.current && !isDragging) {
    if (edgeNavTimerRef.current) { clearTimeout(edgeNavTimerRef.current); edgeNavTimerRef.current = null; }
    if (edgeNavCooldownTimerRef.current) { clearTimeout(edgeNavCooldownTimerRef.current); edgeNavCooldownTimerRef.current = null; }
    edgeNavCooldownRef.current = false;
  }
  prevIsDraggingRef.current = isDragging;

  useEffect(() => {
    if (!isDragging) {
      // Cleanup when drag ends
      if (edgeNavTimerRef.current) { clearTimeout(edgeNavTimerRef.current); edgeNavTimerRef.current = null; }
      if (edgeNavCooldownTimerRef.current) { clearTimeout(edgeNavCooldownTimerRef.current); edgeNavCooldownTimerRef.current = null; }
      edgeNavCooldownRef.current = false;
      return;
    }

    const EDGE_THRESHOLD = 40; // px from screen edge
    const NAV_DELAY = 600; // ms to hold at edge before navigating
    const NAV_COOLDOWN = 800; // ms cooldown between navigations
    let pointerX = 0;
    let edgeDirection: 'left' | 'right' | null = null;

    const handlePointerMove = (e: PointerEvent | MouseEvent) => { pointerX = e.clientX; };
    const handleTouchMoveNav = (e: TouchEvent) => {
      if (e.touches.length > 0) pointerX = e.touches[0].clientX;
    };

    const checkEdge = () => {
      if (edgeNavCooldownRef.current || !isDraggingRef.current) return;
      const screenWidth = window.innerWidth;
      let newDirection: 'left' | 'right' | null = null;

      if (pointerX > 0 && pointerX < EDGE_THRESHOLD) {
        newDirection = 'left';
      } else if (pointerX > screenWidth - EDGE_THRESHOLD) {
        newDirection = 'right';
      }

      if (newDirection !== edgeDirection) {
        // Direction changed or left edge zone — reset timer
        if (edgeNavTimerRef.current) { clearTimeout(edgeNavTimerRef.current); edgeNavTimerRef.current = null; }
        edgeDirection = newDirection;
        if (newDirection) {
          const dir = newDirection;
          edgeNavTimerRef.current = setTimeout(() => {
            if (edgeNavCooldownRef.current || !isDraggingRef.current) return;
            edgeNavCooldownRef.current = true;
            // Use refs to get the latest values (avoid stale closures)
            onDateChange(addDays(currentDateRef.current, dir === 'right' ? 3 : -3));
            // Cooldown before next auto-nav
            edgeNavCooldownTimerRef.current = setTimeout(() => { edgeNavCooldownRef.current = false; }, NAV_COOLDOWN);
          }, NAV_DELAY);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMoveNav);

    const intervalId = setInterval(checkEdge, 100);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMoveNav);
      clearInterval(intervalId);
      if (edgeNavTimerRef.current) { clearTimeout(edgeNavTimerRef.current); edgeNavTimerRef.current = null; }
      if (edgeNavCooldownTimerRef.current) { clearTimeout(edgeNavCooldownTimerRef.current); edgeNavCooldownTimerRef.current = null; }
    };
  }, [isDragging, onDateChange]);

  // When the container scrolls during auto-scroll, update selectionEnd
  // (the pointer is stationary but the grid moves underneath it)
  useEffect(() => {
    const container = effectiveScrollRef.current;
    if (!isSelecting || !container) return;

    const handleScroll = () => {
      if (!activeDayColumnRef.current) return;
      const rect = activeDayColumnRef.current.getBoundingClientRect();
      const y = lastPointerYRef.current - rect.top;
      setSelectionEnd(y);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isSelecting, effectiveScrollRef]);

  // Days strip: desktop renders 3 days starting from currentDate; mobile renders
  // a 9-day strip centered on currentDate (3 before, 3 visible, 3 after) so the
  // user can scroll horizontally with snap, and we recycle the strip when they
  // approach either edge.
  const days = useMemo(() => {
    if (isMobile) {
      return Array.from({ length: 9 }, (_, i) => addDays(currentDate, i - 3));
    }
    return [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)];
  }, [currentDate, isMobile]);

  // Mobile day-column width: each day takes 1/3 of the visible body (viewport
  // minus the sticky time column). Recomputed when the scroll container resizes.
  const [mobileDayWidth, setMobileDayWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!isMobile) {
      setMobileDayWidth(null);
      return;
    }
    const container = scrollContainerRef?.current;
    if (!container) return;
    const update = () => {
      const w = (container.clientWidth - TIME_COL_WIDTH) / 3;
      if (w > 0) setMobileDayWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [isMobile, scrollContainerRef]);

  // Lock used while we're re-centering scrollLeft after an internal currentDate
  // advance, so the scroll handler doesn't immediately retrigger another advance.
  const recenterLockRef = useRef(false);

  // Apply scroll-padding-left so scroll-snap aligns each day group with the
  // right edge of the sticky time column.
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    if (isMobile) {
      container.style.scrollPaddingLeft = `${TIME_COL_WIDTH}px`;
    } else {
      container.style.scrollPaddingLeft = '';
    }
    return () => {
      container.style.scrollPaddingLeft = '';
    };
  }, [isMobile, scrollContainerRef]);

  // Re-center the scroll position to the middle group whenever the date strip
  // changes (initial mount, header button clicks, internal advances). Runs in a
  // layout effect so the reposition is applied before paint to avoid flicker
  // when the strip recycles after an internal advance.
  useLayoutEffect(() => {
    if (!isMobile || !mobileDayWidth) return;
    const container = scrollContainerRef?.current;
    if (!container) return;
    const pageWidth = mobileDayWidth * 3;
    container.scrollLeft = pageWidth;
    // Release the lock once we've recentered. We schedule via rAF so any
    // in-flight scroll events from the reposition fire before the lock clears.
    const raf = requestAnimationFrame(() => {
      recenterLockRef.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [currentDate, isMobile, mobileDayWidth, scrollContainerRef]);

  // Touch-driven "commitment snap": users must drag past ~45% of the page width
  // (or flick with enough velocity) to advance to the previous/next 3 days.
  // Smaller drags spring back to the group they started from. After a committed
  // swipe lands the scroll on an edge group (0 or 2*pageWidth), the scroll-end
  // detector advances currentDate and the recenter effect recycles the strip.
  useEffect(() => {
    if (!isMobile || !mobileDayWidth) return;
    const container = scrollContainerRef?.current;
    if (!container) return;

    const pageWidth = mobileDayWidth * 3;
    const COMMIT_THRESHOLD = 0.45; // fraction of pageWidth
    const FLING_LOOKAHEAD_MS = 200;

    let touchStartScrollLeft = 0;
    let lastTouchScrollLeft = 0;
    let lastTouchTime = 0;
    let isTouching = false;

    const onTouchStart = () => {
      touchStartScrollLeft = container.scrollLeft;
      lastTouchScrollLeft = touchStartScrollLeft;
      lastTouchTime = performance.now();
      isTouching = true;
    };

    const onTouchMove = () => {
      lastTouchScrollLeft = container.scrollLeft;
      lastTouchTime = performance.now();
    };

    const onTouchEnd = () => {
      if (!isTouching) return;
      isTouching = false;

      const now = performance.now();
      const dt = Math.max(now - lastTouchTime, 1);
      const velocity = (container.scrollLeft - lastTouchScrollLeft) / dt; // px/ms
      const projection = container.scrollLeft + velocity * FLING_LOOKAHEAD_MS;

      const startIndex = Math.round(touchStartScrollLeft / pageWidth);
      const projectedDelta = projection / pageWidth - startIndex;

      let direction = 0;
      if (projectedDelta > COMMIT_THRESHOLD) direction = 1;
      else if (projectedDelta < -COMMIT_THRESHOLD) direction = -1;

      const desiredIndex = startIndex + direction;

      // If already at an edge group and the user commits to go further, jump
      // directly to the date advance (no intermediate scroll-to-the-same-spot).
      if (desiredIndex < 0) {
        recenterLockRef.current = true;
        onDateChange(addDays(currentDateRef.current, -3));
        return;
      }
      if (desiredIndex > 2) {
        recenterLockRef.current = true;
        onDateChange(addDays(currentDateRef.current, 3));
        return;
      }

      container.scrollTo({ left: desiredIndex * pageWidth, behavior: 'smooth' });
    };

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (recenterLockRef.current) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (recenterLockRef.current || isTouching) return;
        const sl = container.scrollLeft;
        const threshold = 8;
        if (sl >= 2 * pageWidth - threshold) {
          recenterLockRef.current = true;
          onDateChange(addDays(currentDateRef.current, 3));
        } else if (sl <= threshold) {
          recenterLockRef.current = true;
          onDateChange(addDays(currentDateRef.current, -3));
        }
      }, 120);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('scroll', onScroll);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [isMobile, mobileDayWidth, onDateChange, scrollContainerRef]);

  // Track recent drag to block swipe navigation right after a drag ends
  const recentDragRef = useRef(false);
  useEffect(() => {
    if (isDragging) {
      recentDragRef.current = true;
    } else if (recentDragRef.current) {
      // Keep the flag true briefly after drag ends to block swipe from the same gesture
      const timer = setTimeout(() => { recentDragRef.current = false; }, 300);
      return () => clearTimeout(timer);
    }
  }, [isDragging]);

  // Swipe handlers for navigation - disabled when dragging or just finished dragging.
  // On mobile we disable swipe entirely: navigation happens via horizontal scroll
  // and the header buttons (per product decision).
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => !isMobile && !isDraggingRef.current && !recentDragRef.current && onDateChange(addDays(currentDate, 3)),
    onSwipeRight: () => !isMobile && !isDraggingRef.current && !recentDragRef.current && onDateChange(addDays(currentDate, -3)),
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

  // Handle slot click - only if not dragging a booking card
  const handleSlotClick = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    // Block the click event that fires right after a drag-selection mouseup
    if (dragJustCompletedRef.current) {
      dragJustCompletedRef.current = false;
      return;
    }
    if (isSelecting || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = yToTime(y);
    onSlotClick(date, time);
  };

  // Handle drag selection start
  const handleMouseDown = (date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    // If the click target is inside a draggable card, don't start slot-creation
    const target = e.target as HTMLElement;
    if (target.closest?.('[aria-roledescription="draggable"]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    activeDayColumnRef.current = e.currentTarget;
    lastPointerYRef.current = e.clientY;
    setSelectionStart({ date, y });
    setSelectionEnd(y);
    setIsSelecting(true);
  };

  // Handle drag selection move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || isDragging) return;
    lastPointerYRef.current = e.clientY;
    // Use the active day column ref for accurate position during auto-scroll
    const target = activeDayColumnRef.current || e.currentTarget;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelectionEnd(y);
  };

  // Handle drag selection end
  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd !== null) {
      const startTime = yToTime(Math.min(selectionStart.y, selectionEnd));
      const endTime = yToTime(Math.max(selectionStart.y, selectionEnd));
      if (startTime !== endTime) {
        dragJustCompletedRef.current = true;
        onSlotClick(selectionStart.date, startTime, endTime);
      }
    }
    activeDayColumnRef.current = null;
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

  // Handle touch drag selection start (mobile)
  // Uses a 200ms hold delay to distinguish drag-to-create from scrolling
  // Skips selection if the touch originated on a draggable card (booking/event)
  const handleTouchStart = useCallback((date: Date, e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging || e.touches.length > 1) return;

    // If the touch target is inside a draggable card, don't start slot-creation.
    // dnd-kit sets aria-roledescription="draggable" on draggable elements.
    const target = e.target as HTMLElement;
    if (target.closest?.('[aria-roledescription="draggable"]')) {
      return;
    }

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    activeDayColumnRef.current = e.currentTarget;
    lastPointerYRef.current = touch.clientY;
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
      lastPointerYRef.current = touch.clientY;
      // Use active day column's current rect for accurate position during auto-scroll
      const target = activeDayColumnRef.current;
      const y = target
        ? touch.clientY - target.getBoundingClientRect().top
        : touch.clientY - touchStartRef.current.rectTop;
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
        onSlotClick(selectionStart.date, startTime, endTime);
      }
    }
    touchStartRef.current = null;
    touchModeRef.current = 'undetermined';
    activeDayColumnRef.current = null;
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

  // Check if current time indicator should show
  const showCurrentTime = useMemo(() => {
    return days.some(day => isToday(day)) && currentTimePosition !== null;
  }, [days, currentTimePosition]);

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

  // Barber colors for floating legend. Depends on colorVersion so it
  // refreshes when an admin changes a barber's color.
  const colorVersion = useBarberColorVersion();
  const barberColors = useMemo(() => {
    return [...barberNames].sort().map((name) => ({
      name,
      colors: getBarberPastelColorByName(name),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberNames, colorVersion]);

  // Split barber legend items into balanced rows
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
    <div
      ref={containerRef}
      className="flex flex-col flex-1"
      style={{ backgroundColor: '#f5f5f5' }}
      {...swipeHandlers}
    >
      {/* Sticky header: Column Headers + Legend overlay */}
      <div className="sticky top-0 z-30 bg-white relative">
        {/* Column Headers */}
        <div className="flex border-b" style={{ borderColor: '#e0e0e0' }}>
          {/* Time column spacer (sticky-left on mobile so it covers the corner
              when scrolling horizontally) */}
          <div
            className={cn(
              'w-12 shrink-0 bg-white',
              isMobile && 'sticky left-0 z-40'
            )}
            style={{ borderRight: '1px solid #e0e0e0' }}
          />

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayIsToday = isToday(day);
            const isMobileSnap = isMobile && dayIdx % 3 === 0;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'py-1.5 flex items-center justify-center gap-1.5 shrink-0 bg-white',
                  !isMobile && 'flex-1',
                  isMobileSnap && 'snap-start'
                )}
                style={{
                  borderRight: '1px solid #e0e0e0',
                  width: isMobile
                    ? (mobileDayWidth ?? `calc((100vw - ${TIME_COL_WIDTH}px) / 3)`)
                    : undefined,
                }}
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

        {/* Legend - hangs below sticky header, overlays grid */}
        {legendRows.length > 0 && (
          <div
            className={cn(
              "absolute left-12 right-0 top-full z-30 flex justify-center pointer-events-none pt-1.5 px-2",
              "transition-all duration-200 ease-in-out",
              isMonthPickerOpen ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            <div
              className={cn(
                "rounded-xl px-4 py-1.5 max-w-full",
                !isMonthPickerOpen && "pointer-events-auto"
              )}
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

      {/* Scrollable content */}
      <div className="flex-1">
        <div className="flex relative">
          {/* Time labels column (sticky-left on mobile so the labels stay
              visible while the day strip scrolls horizontally) */}
          <div
            className={cn(
              'w-12 shrink-0 bg-white relative',
              isMobile && 'sticky left-0 z-30'
            )}
            style={{ borderRight: '1px solid #e0e0e0' }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative"
                style={{ height: hourHeight }}
              >
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

            {/* Current time label - inside the (sticky on mobile) time column
                so the "HH:mm" pill stays visible during horizontal scroll and
                the column overlaps the line that scrolls beneath it. */}
            {showCurrentTime && currentTimePosition !== null && (
              <div
                className={cn(
                  'absolute flex items-center justify-end pointer-events-none transition-opacity duration-200 ease-in-out',
                  isMonthPickerOpen ? 'opacity-0' : 'opacity-100'
                )}
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
                    backgroundColor: '#000000',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {format(currentTime, 'H:mm')}
                </span>
              </div>
            )}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayBookings = getBookingsForDay(day);
            const dayIsToday = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isMobileSnap = isMobile && dayIdx % 3 === 0;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative shrink-0',
                  !isMobile && 'flex-1',
                  isMobileSnap && 'snap-start'
                )}
                style={{
                  borderRight: '1px solid #e0e0e0',
                  backgroundColor: dayIsToday ? '#fafafa' : '#f8f8f8',
                  width: isMobile
                    ? (mobileDayWidth ?? `calc((100vw - ${TIME_COL_WIDTH}px) / 3)`)
                    : undefined,
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
                    isClosed={isHourClosed ? isHourClosed(hour, day) : undefined}
                    isDragging={isDragging}
                    draggedBookingDuration={draggedBookingDuration}
                    draggedBookingClientName={draggedBookingClientName}
                    draggedBookingServiceName={draggedBookingServiceName}
                    draggedBookingColorClasses={draggedBookingColorClasses}
                    closedMinuteRanges={getClosedMinuteRanges ? getClosedMinuteRanges(hour, day) : undefined}
                    className={cn(
                      'border-b-0',
                      !isDragging && !(isHourClosed ? isHourClosed(hour, day) : false) && 'hover:bg-muted/10'
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

                {/* Bookings + Events with unified overlap detection */}
                {(() => {
                  const dayEvents = getEventsForDayProp ? getEventsForDayProp(day) : [];
                  const allItems = [...dayBookings, ...dayEvents];
                  return (
                    <>
                      {dayBookings.map((booking) => {
                        const style = getBookingPosition(booking, hourHeight, START_HOUR);
                        const overlapInfo = getUnifiedOverlapInfo(allItems, booking);
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
                      {onEventClick && dayEvents.map((event) => {
                        const evtStyle = getEventPosition(event, hourHeight, START_HOUR);
                        const overlapInfo = getUnifiedOverlapInfo(allItems, event);

                        const leftCalc = `calc(${(overlapInfo.index / overlapInfo.total) * 100}% + 2px)`;
                        const widthCalc = `calc(${100 / overlapInfo.total}% - 4px)`;

                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            style={{
                              top: evtStyle.top,
                              height: evtStyle.height,
                              left: leftCalc,
                              width: widthCalc,
                            }}
                            onClick={() => onEventClick(event)}
                            isDraggable={true}
                            viewMode="day"
                            isMobile={true}
                            isPendingMove={pendingMoveEventId === event.id}
                          />
                        );
                      })}
                    </>
                  );
                })()}

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

          {/* Current time indicator dot + line. Sits below the sticky time
              column's z-index so the column visually overlaps it during
              horizontal scroll. The "HH:mm" pill is rendered inside the time
              column (above) to remain sticky-visible. */}
          {showCurrentTime && currentTimePosition !== null && (
            <div
              data-current-time-indicator
              className={cn(
                'absolute flex items-center pointer-events-none transition-opacity duration-200 ease-in-out',
                isMonthPickerOpen ? 'opacity-0' : 'opacity-100'
              )}
              style={{
                top: currentTimePosition,
                left: '48px',
                right: 0,
                zIndex: 25,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: '#000000', marginLeft: '-5px' }}
              />
              <div
                className="flex-1"
                style={{ height: '2px', backgroundColor: '#000000' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
