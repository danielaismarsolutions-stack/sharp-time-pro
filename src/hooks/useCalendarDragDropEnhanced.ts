// Enhanced drag-and-drop hook with 5-minute snapping, barber schedule validation, and business hours
// Supports confirmation dialog flow: drop -> show dialog -> confirm/cancel
// Supports both bookings and calendar events
// Moving outside business/barber hours (or onto vacations/closure days) is
// allowed but surfaces a warning in the drop preview and confirmation dialog.
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { parse, format, addMinutes, differenceInMinutes, getDay } from 'date-fns';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Barber, BarberSchedule } from '@/types/barber';
import { BusinessHours, ClosureDate } from '@/types';
import { supabaseBookingsApi, supabaseEventBookingsApi, UpdateBookingData } from '@/services/supabaseBookings';
import { notifyAllAdmins, notifyBookingUsers } from '@/services/supabaseNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { useToast } from '@/hooks/use-toast';
import type { MoveBookingDetails } from '@/components/calendar/MoveBookingConfirmDialog';
import type { MoveEventDetails } from '@/components/calendar/MoveEventConfirmDialog';

interface UseCalendarDragDropEnhancedOptions {
  bookings: ApiBooking[];
  barbers: Barber[];
  onBookingUpdate: (bookingId: string, updatedBooking: ApiBooking) => void;
  onBookingsChange: (updatedBookings: ApiBooking[]) => void;
  hourHeight: number;
  startHour?: number;
  businessOpenHour?: number;
  businessCloseHour?: number;
  // Real business hours (per-day shifts from the business_hours table).
  // When provided, they replace the flat open/close hour fallback above.
  businessHours?: BusinessHours;
  // Business-wide closure dates (holidays) from the holidays table
  closureDates?: ClosureDate[];
  // Event drag support
  events?: ApiCalendarEvent[];
  onEventUpdate?: (eventId: string, updatedEvent: ApiCalendarEvent) => void;
  onEventsChange?: (updatedEvents: ApiCalendarEvent[]) => void;
}

interface UndoAction {
  bookingId: string;
  previousState: Partial<ApiBooking>;
}

interface DropPreview {
  date: string;
  time: string;
  /** Blocking: overlaps another booking of the same barber */
  hasConflict: boolean;
  conflictingBookings: string[];
  /** Non-blocking: outside business/barber hours, vacation or closure day */
  scheduleWarning?: string;
}

// Day of week mapping (getDay returns 0=Sunday, 1=Monday, etc.)
const DAY_OF_WEEK_TO_KEY: Record<number, keyof BarberSchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// Drag snapping granularity in minutes
export const DRAG_SNAP_MINUTES = 5;

// Snap to the nearest drag interval (5 minutes)
export function snapToDragInterval(minutes: number): number {
  return Math.round(minutes / DRAG_SNAP_MINUTES) * DRAG_SNAP_MINUTES;
}

// Calculate time from Y position
export function calculateTimeFromY(
  y: number,
  hourHeight: number,
  startHour: number = 8
): { hours: number; minutes: number; timeString: string } {
  const pixelsPerMinute = hourHeight / 60;
  const totalMinutes = Math.max(0, y / pixelsPerMinute);
  const snappedMinutes = snapToDragInterval(totalMinutes);

  const hours = Math.floor(snappedMinutes / 60) + startHour;
  const minutes = snappedMinutes % 60;
  const clampedHours = Math.min(Math.max(hours, startHour), 23);

  return {
    hours: clampedHours,
    minutes,
    timeString: `${clampedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
  };
}

// Check if a time slot falls within business operating hours
export function isWithinBusinessHours(
  hour: number,
  businessOpenHour: number = 8,
  businessCloseHour: number = 21
): boolean {
  return hour >= businessOpenHour && hour < businessCloseHour;
}

// Parse a YYYY-MM-DD date string as LOCAL time. `new Date('YYYY-MM-DD')`
// parses as UTC midnight, which shifts the day of week in negative-offset
// timezones — never use it for schedule math.
function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

// Convert "HH:mm" or "HH:mm:ss" to minutes since midnight
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Check business-wide closure dates (holidays). Non-blocking: returns a
// warning reason when the business is closed that day.
export function checkClosureDate(
  closureDates: ClosureDate[] | undefined,
  date: string
): { isClosed: boolean; reason?: string } {
  const closure = closureDates?.find(c => c.isClosed && c.date === date);
  if (!closure) return { isClosed: false };
  return {
    isClosed: true,
    reason: closure.name
      ? `El negocio está cerrado ese día (${closure.name})`
      : 'El negocio está cerrado ese día',
  };
}

// Check if a booking fits within the business opening shifts for that day.
// Uses the real business_hours data (supports split shifts); falls back to
// the flat open/close hours when no data is available.
export function checkBusinessSchedule(
  businessHours: BusinessHours | undefined,
  date: string,
  startTime: string,
  endTime: string,
  fallbackOpenHour: number = 8,
  fallbackCloseHour: number = 21
): { isWithin: boolean; reason?: string } {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const dayKey = DAY_OF_WEEK_TO_KEY[getDay(parseLocalDate(date))];
  const dayData = businessHours?.[dayKey];

  if (!dayData) {
    // No business hours loaded — fall back to flat open/close hours
    if (start < fallbackOpenHour * 60 || end > fallbackCloseHour * 60) {
      return {
        isWithin: false,
        reason: `Fuera del horario del negocio (${fallbackOpenHour}:00-${fallbackCloseHour}:00)`,
      };
    }
    return { isWithin: true };
  }

  if (!dayData.isOpen || dayData.shifts.length === 0) {
    return { isWithin: false, reason: 'El negocio no abre este día' };
  }

  const fitsInShift = dayData.shifts.some(shift =>
    start >= timeToMinutes(shift.openTime) && end <= timeToMinutes(shift.closeTime)
  );

  if (!fitsInShift) {
    const shiftsText = dayData.shifts
      .map(s => `${s.openTime}-${s.closeTime}`)
      .join(', ');
    return {
      isWithin: false,
      reason: `Fuera del horario del negocio (${shiftsText})`,
    };
  }

  return { isWithin: true };
}

// Check if barber is available at the given date and time
export function checkBarberSchedule(
  barbers: Barber[],
  barberName: string | null | undefined,
  date: string,
  startTime: string,
  endTime: string
): { isAvailable: boolean; reason?: string } {
  // If no barber assigned, allow the drop (no schedule to check)
  if (!barberName) {
    return { isAvailable: true };
  }

  // Find barber by name
  const barber = barbers.find(b => b.name === barberName);
  if (!barber) {
    return { isAvailable: true }; // Barber not found, allow anyway
  }

  const dayOfWeek = getDay(parseLocalDate(date));
  const dayKey = DAY_OF_WEEK_TO_KEY[dayOfWeek];
  const daySchedule = barber.schedule?.[dayKey];

  // Check if barber has time off on this date. Dates are YYYY-MM-DD strings,
  // so lexicographic comparison is exact and timezone-safe.
  const timeOff = (barber.time_off ?? []).find(
    to => date >= to.start_date && date <= to.end_date
  );

  if (timeOff) {
    return {
      isAvailable: false,
      reason: timeOff.reason
        ? `${barberName} tiene el día libre (${timeOff.reason})`
        : `${barberName} tiene el día libre`,
    };
  }

  // Check if the day is enabled
  if (!daySchedule || !daySchedule.enabled || daySchedule.shifts.length === 0) {
    return {
      isAvailable: false,
      reason: `${barberName} no trabaja este día`,
    };
  }

  const bookingStart = timeToMinutes(startTime);
  const bookingEnd = timeToMinutes(endTime);

  // Check if the booking fits within any of the barber's shifts
  const fitsInShift = daySchedule.shifts.some(shift =>
    bookingStart >= timeToMinutes(shift.start) && bookingEnd <= timeToMinutes(shift.end)
  );

  if (!fitsInShift) {
    const shiftsText = daySchedule.shifts
      .map(s => `${s.start}-${s.end}`)
      .join(', ');
    return {
      isAvailable: false,
      reason: `Fuera del horario de ${barberName} (${shiftsText})`,
    };
  }

  return { isAvailable: true };
}

// Check for conflicts with other bookings (same barber only)
export function checkConflicts(
  bookings: ApiBooking[],
  bookingId: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
  barber?: string | null
): { hasConflict: boolean; conflictingBookings: ApiBooking[] } {
  const newStart = parse(newStartTime, 'HH:mm', new Date());
  const newEnd = parse(newEndTime, 'HH:mm', new Date());

  const conflicting = bookings.filter(b => {
    if (b.id === bookingId) return false;
    if (b.booking_date !== newDate) return false;
    if (b.status === 'cancelled') return false;

    // Allow overlap if different barbers are assigned
    if (barber && b.barber && barber !== b.barber) return false;

    const existingStart = parse(b.start_time.substring(0, 5), 'HH:mm', new Date());
    const existingEnd = parse(b.end_time.substring(0, 5), 'HH:mm', new Date());

    return newStart < existingEnd && newEnd > existingStart;
  });

  return {
    hasConflict: conflicting.length > 0,
    conflictingBookings: conflicting,
  };
}

// Helper: check if active drag ID is an event
function isEventDragId(id: string): boolean {
  return id.startsWith('event-');
}

// Helper: extract real event ID from drag ID
function extractEventId(dragId: string): string {
  return dragId.replace(/^event-/, '');
}

export function useCalendarDragDropEnhanced({
  bookings,
  barbers,
  onBookingUpdate,
  onBookingsChange,
  hourHeight,
  startHour = 8,
  businessOpenHour = 8,
  businessCloseHour = 21,
  businessHours,
  closureDates,
  events = [],
  onEventUpdate,
  onEventsChange,
}: UseCalendarDragDropEnhancedOptions) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Auto-dismiss undo stack after 2 seconds
  useEffect(() => {
    if (undoStack.length > 0) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setUndoStack([]);
      }, 2000);
    }
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [undoStack.length]);

  // Booking confirmation dialog state
  const [pendingMove, setPendingMove] = useState<MoveBookingDetails | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Event confirmation dialog state
  const [pendingEventMove, setPendingEventMove] = useState<MoveEventDetails | null>(null);
  const [showEventConfirmDialog, setShowEventConfirmDialog] = useState(false);

  // Is the current drag an event?
  const isDraggingEvent = useMemo(() => {
    return activeId ? isEventDragId(activeId) : false;
  }, [activeId]);

  // Get active booking (only for booking drags)
  const activeBooking = useMemo(() => {
    if (!activeId || isDraggingEvent) return null;
    return bookings.find(b => b.id === activeId) || null;
  }, [activeId, bookings, isDraggingEvent]);

  // Get active event (only for event drags)
  const activeEvent = useMemo(() => {
    if (!activeId || !isDraggingEvent) return null;
    const eventId = extractEventId(activeId);
    return events.find(e => e.id === eventId) || null;
  }, [activeId, events, isDraggingEvent]);

  // Calculate booking duration
  const getBookingDuration = useCallback((booking: ApiBooking): number => {
    const start = parse(booking.start_time, 'HH:mm:ss', new Date());
    const end = parse(booking.end_time, 'HH:mm:ss', new Date());
    return differenceInMinutes(end, start);
  }, []);

  // Calculate event duration
  const getEventDuration = useCallback((event: ApiCalendarEvent): number => {
    const start = parse(event.start_time, 'HH:mm:ss', new Date());
    const end = parse(event.end_time, 'HH:mm:ss', new Date());
    return differenceInMinutes(end, start);
  }, []);

  // Compute the 5-min-snapped start time (HH:MM) from the live drag event.
  // Shared between handleDragMove (preview) and handleDragEnd (commit) so the
  // two paths can never disagree.
  //
  // We derive the position from `active.rect.current.translated` (the dragged
  // element's translated rect) instead of `activatorEvent.clientY`. The
  // activator event is a PointerEvent on desktop but a TouchEvent on touch
  // devices, where `clientY` is undefined → previously the math fell back to
  // 0 and every drop snapped to ":00" of the hovered hour. Reading the
  // translated rect works identically across input types.
  const computeSnappedStartTime = useCallback(
    (
      e: DragMoveEvent | DragEndEvent,
      baseHour: number,
      overRect: { top: number },
    ): string => {
      const translated = e.active.rect.current.translated;
      // Fallback: if the translated rect is unavailable for any reason, use
      // the activator pointer position (works on mouse / pointer events).
      const cardTop = translated?.top
        ?? ((e.activatorEvent as PointerEvent)?.clientY ?? 0) + e.delta.y;
      const relativeY = Math.max(0, Math.min(hourHeight, cardTop - overRect.top));
      const snapped = snapToDragInterval((relativeY / hourHeight) * 60);
      const minutes = snapped >= 60 ? 0 : snapped;
      const hours = snapped >= 60 ? Math.min(baseHour + 1, 23) : baseHour;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    },
    [hourHeight],
  );

  // Collect NON-BLOCKING schedule warnings for a prospective move: closure
  // days (holidays), business opening shifts and — for bookings — the
  // assigned barber's schedule/vacations. The move is still allowed; these
  // are surfaced in the preview and the confirmation dialog.
  const collectScheduleWarnings = useCallback(
    (
      date: string,
      newStartTime: string,
      newEndTime: string,
      barberName?: string | null,
    ): string[] => {
      const warnings: string[] = [];

      const closureCheck = checkClosureDate(closureDates, date);
      if (closureCheck.isClosed && closureCheck.reason) {
        warnings.push(closureCheck.reason);
      }

      const businessCheck = checkBusinessSchedule(
        businessHours,
        date,
        newStartTime,
        newEndTime,
        businessOpenHour,
        businessCloseHour
      );
      if (!businessCheck.isWithin && businessCheck.reason) {
        warnings.push(businessCheck.reason);
      }

      if (barberName !== undefined) {
        const barberCheck = checkBarberSchedule(barbers, barberName, date, newStartTime, newEndTime);
        if (!barberCheck.isAvailable && barberCheck.reason) {
          warnings.push(barberCheck.reason);
        }
      }

      return warnings;
    },
    [closureDates, businessHours, businessOpenHour, businessCloseHour, barbers],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDropPreview(null);

    // Haptic "pickup" pattern: pulso-pausa-pulso. Confirma al usuario que el
    // long-press se activó y la cita quedó "agarrada".
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10]);
    }
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over } = event;
    if (!over || !activeId) return;

    const dropData = over.data.current as {
      hour?: number;
      date?: string;
    } | undefined;

    if (!dropData?.date || dropData.hour === undefined) return;

    const newStartTime = computeSnappedStartTime(event, dropData.hour, over.rect);

    if (isDraggingEvent) {
      // Event drag move - no booking conflicts or barber schedule to check
      const evt = activeEvent;
      if (!evt) return;

      const duration = getEventDuration(evt);
      const crossesMidnight = timeToMinutes(newStartTime) + duration > 24 * 60;
      const endDate = addMinutes(parse(newStartTime, 'HH:mm', new Date()), duration);
      const newEndTime = format(endDate, 'HH:mm');

      // Business schedule + closure days are warnings, never blockers
      const warnings = collectScheduleWarnings(dropData.date, newStartTime, newEndTime);

      setDropPreview({
        date: dropData.date,
        time: newStartTime,
        hasConflict: crossesMidnight,
        conflictingBookings: [],
        scheduleWarning: crossesMidnight
          ? 'Terminaría después de medianoche'
          : warnings.length > 0 ? warnings.join(' · ') : undefined,
      });
    } else {
      // Booking drag move - full validation
      const booking = bookings.find(b => b.id === activeId);
      if (!booking) return;

      const duration = getBookingDuration(booking);
      const crossesMidnight = timeToMinutes(newStartTime) + duration > 24 * 60;
      const endDate = addMinutes(parse(newStartTime, 'HH:mm', new Date()), duration);
      const newEndTime = format(endDate, 'HH:mm');

      // Check for conflicts (same barber only) — this is the only blocker
      const { hasConflict, conflictingBookings } = checkConflicts(
        bookings,
        activeId,
        dropData.date,
        newStartTime,
        newEndTime,
        booking.barber
      );

      // Business/barber schedule, vacations and closure days are warnings
      const warnings = collectScheduleWarnings(
        dropData.date,
        newStartTime,
        newEndTime,
        booking.barber
      );

      setDropPreview({
        date: dropData.date,
        time: newStartTime,
        hasConflict: hasConflict || crossesMidnight,
        conflictingBookings: conflictingBookings.map(b => b.client_name),
        scheduleWarning: crossesMidnight
          ? 'Terminaría después de medianoche'
          : warnings.length > 0 ? warnings.join(' · ') : undefined,
      });
    }

    // Haptic feedback when snapping to a new time
    if ('vibrate' in navigator && dropPreview?.time !== newStartTime) {
      navigator.vibrate(5);
    }
  }, [activeId, isDraggingEvent, activeEvent, bookings, getBookingDuration, getEventDuration, computeSnappedStartTime, collectScheduleWarnings, dropPreview?.time]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDropPreview(null);
  }, []);

  const handleUndo = useCallback(async (bookingId: string, previousState: Partial<ApiBooking>) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Optimistic revert
    const revertedBooking = { ...booking, ...previousState } as ApiBooking;
    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? revertedBooking : b
    );
    onBookingsChange(updatedBookings);

    try {
      await supabaseBookingsApi.update(bookingId, previousState as UpdateBookingData);
      toast({ title: 'Cambio deshecho' });
      setUndoStack(prev => prev.filter(a => a.bookingId !== bookingId));
    } catch (error) {
      onBookingsChange(bookings);
      toast({ title: 'Error al deshacer', variant: 'destructive' });
    }
  }, [bookings, onBookingsChange, toast]);

  // Called when user drops a card - shows confirmation dialog
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const savedDropPreview = dropPreview; // Capture before resetting
    const wasDraggingEvent = isEventDragId(active.id as string);
    setActiveId(null);
    setDropPreview(null);

    if (!over) return;

    const dropData = over.data.current as {
      hour?: number;
      date?: string;
    } | undefined;

    if (!dropData?.date || dropData.hour === undefined) return;

    // Always recompute the 5-min-snapped time from the live drop event so the
    // fallback path can never collapse to ":00". Prefer the preview only when
    // it matches the cell the user actually released over.
    const computedStartTime = computeSnappedStartTime(event, dropData.hour, over.rect);

    let newStartTime: string;
    let newDate: string;

    if (
      savedDropPreview?.time &&
      savedDropPreview?.date &&
      savedDropPreview.date === dropData.date
    ) {
      newStartTime = `${savedDropPreview.time}:00`;
      newDate = savedDropPreview.date;
    } else {
      newStartTime = `${computedStartTime}:00`;
      newDate = dropData.date;
    }

    if (wasDraggingEvent) {
      // Handle event drop
      const eventId = extractEventId(active.id as string);
      const evt = events.find(e => e.id === eventId);
      if (!evt) return;

      const duration = getEventDuration(evt);
      const endDate = addMinutes(parse(newStartTime, 'HH:mm:ss', new Date()), duration);
      const newEndTime = format(endDate, 'HH:mm:ss');

      // Check if anything changed
      if (newDate === evt.event_date && newStartTime === evt.start_time) {
        return;
      }

      // Block moves whose end would roll past midnight (end < start in DB)
      if (timeToMinutes(newStartTime) + duration > 24 * 60) {
        toast({
          title: 'Horario no válido',
          description: 'El evento terminaría después de medianoche',
          variant: 'destructive',
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
        return;
      }

      // Outside-schedule drops are allowed — collect warnings for the dialog
      const warnings = collectScheduleWarnings(
        newDate,
        newStartTime.substring(0, 5),
        newEndTime.substring(0, 5)
      );

      // Show event confirmation dialog
      setPendingEventMove({
        event: evt,
        oldDate: evt.event_date,
        oldStartTime: evt.start_time,
        oldEndTime: evt.end_time,
        newDate,
        newStartTime,
        newEndTime,
        warnings,
      });
      setShowEventConfirmDialog(true);

      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
    } else {
      // Handle booking drop
      const bookingId = active.id as string;
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const duration = getBookingDuration(booking);
      const endDate = addMinutes(parse(newStartTime, 'HH:mm:ss', new Date()), duration);
      const newEndTime = format(endDate, 'HH:mm:ss');

      // Check if anything changed
      if (newDate === booking.booking_date && newStartTime === booking.start_time) {
        return;
      }

      // Block moves whose end would roll past midnight (end < start in DB)
      if (timeToMinutes(newStartTime) + duration > 24 * 60) {
        toast({
          title: 'Horario no válido',
          description: 'La cita terminaría después de medianoche',
          variant: 'destructive',
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
        return;
      }

      // Check for conflicts (same barber only) — the only hard blocker
      const { hasConflict, conflictingBookings } = checkConflicts(
        bookings,
        bookingId,
        newDate,
        newStartTime.substring(0, 5),
        newEndTime.substring(0, 5),
        booking.barber
      );

      if (hasConflict) {
        toast({
          title: 'Horario ocupado',
          description: `Conflicto con: ${conflictingBookings.map(b => b.client_name).join(', ')}`,
          variant: 'destructive',
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
        return;
      }

      // Outside-schedule drops (business hours, barber shifts, vacations,
      // closure days) are allowed — collect warnings for the dialog
      const warnings = collectScheduleWarnings(
        newDate,
        newStartTime.substring(0, 5),
        newEndTime.substring(0, 5),
        booking.barber
      );

      // Show booking confirmation dialog
      setPendingMove({
        booking,
        oldDate: booking.booking_date,
        oldStartTime: booking.start_time,
        oldEndTime: booking.end_time,
        newDate,
        newStartTime,
        newEndTime,
        warnings,
      });
      setShowConfirmDialog(true);

      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
    }
  }, [bookings, events, toast, getBookingDuration, getEventDuration, computeSnappedStartTime, collectScheduleWarnings, dropPreview]);

  // Confirm booking move
  const confirmMove = useCallback(async () => {
    if (!pendingMove) return;

    const { booking, newDate, newStartTime, newEndTime } = pendingMove;
    const bookingId = booking.id;

    setIsUpdating(true);

    // Store previous state for undo
    const previousState = {
      booking_date: pendingMove.oldDate,
      start_time: pendingMove.oldStartTime,
      end_time: pendingMove.oldEndTime,
    };

    // Move the card visually now (optimistic on confirm)
    const optimisticBooking: ApiBooking = {
      ...booking,
      booking_date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
    };
    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? optimisticBooking : b
    );
    onBookingsChange(updatedBookings);

    try {
      const updated = await supabaseBookingsApi.update(bookingId, {
        booking_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });

      onBookingUpdate(bookingId, updated);
      setUndoStack(prev => [...prev.slice(-9), { bookingId, previousState }]);

      // Notify admins + barber about booking modification
      try {
        await notifyBookingUsers({
          business_id: getBusinessId(),
          type: 'booking_modified',
          title: 'Cita movida',
          message: `${user?.name || 'Usuario'} movió la cita de ${booking.client_name} (${booking.service_name}) al ${format(parseLocalDate(newDate), 'dd/MM/yyyy', { locale: es })} a las ${newStartTime.substring(0, 5)}`,
          barber_user_id: booking.user_id,
          performed_by_user_id: user?.id || '',
          metadata: {
            booking_id: bookingId,
            client_name: booking.client_name,
            service_name: booking.service_name,
            booking_date: newDate,
            start_time: newStartTime,
          },
        });
      } catch { /* ignored */ }

      // Haptic feedback on success
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }

      const movedOutOfSchedule = (pendingMove.warnings?.length ?? 0) > 0;
      toast({
        title: movedOutOfSchedule ? 'Cita movida fuera de horario' : 'Cita movida',
        description: `${booking.client_name} → ${format(parseLocalDate(newDate), 'dd/MM')} a las ${newStartTime.substring(0, 5)}`,
        duration: movedOutOfSchedule ? 4000 : 2000,
      });
    } catch (error) {
      // Revert on backend error - put booking back
      onBookingUpdate(bookingId, booking);
      toast({
        title: 'Error al mover cita',
        description: 'No se pudo actualizar la cita',
        variant: 'destructive',
      });
    } finally {
      setPendingMove(null);
      setShowConfirmDialog(false);
      setIsUpdating(false);
    }
  }, [pendingMove, bookings, onBookingUpdate, onBookingsChange, toast, user?.id, user?.name]);

  // Cancel booking move
  const cancelMove = useCallback(() => {
    setPendingMove(null);
    setShowConfirmDialog(false);
  }, []);

  // Confirm event move
  const confirmEventMove = useCallback(async () => {
    if (!pendingEventMove || !onEventsChange || !onEventUpdate) return;

    const { event: evt, newDate, newStartTime, newEndTime } = pendingEventMove;

    setIsUpdating(true);

    // Optimistic update
    const optimisticEvent: ApiCalendarEvent = {
      ...evt,
      event_date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
    };
    const updatedEvents = events.map(e =>
      e.id === evt.id ? optimisticEvent : e
    );
    onEventsChange(updatedEvents);

    try {
      const updatedBooking = await supabaseEventBookingsApi.update(evt.id, {
        booking_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });

      // Convert the returned booking back to ApiCalendarEvent
      const updatedEvent: ApiCalendarEvent = {
        ...evt,
        event_date: updatedBooking.booking_date,
        start_time: updatedBooking.start_time,
        end_time: updatedBooking.end_time,
        updated_at: updatedBooking.updated_at,
      };
      onEventUpdate(evt.id, updatedEvent);

      // Notify all admins about event move
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'event_modified',
          title: 'Evento movido',
          message: `${user?.name || 'Usuario'} movió el evento "${evt.name}" al ${format(parseLocalDate(newDate), 'dd/MM/yyyy', { locale: es })} a las ${newStartTime.substring(0, 5)}`,
          performed_by_user_id: user?.id || '',
          metadata: {
            event_id: evt.id,
            event_name: evt.name,
            event_date: newDate,
            start_time: newStartTime,
          },
        });
      } catch { /* ignored */ }

      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }

      const movedOutOfSchedule = (pendingEventMove.warnings?.length ?? 0) > 0;
      toast({
        title: movedOutOfSchedule ? 'Evento movido fuera de horario' : 'Evento movido',
        description: `${evt.name} → ${format(parseLocalDate(newDate), 'dd/MM')} a las ${newStartTime.substring(0, 5)}`,
        duration: movedOutOfSchedule ? 4000 : 2000,
      });
    } catch (error) {
      // Revert on backend error
      onEventsChange(events);
      toast({
        title: 'Error al mover evento',
        description: 'No se pudo actualizar el evento',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
      setPendingEventMove(null);
      setShowEventConfirmDialog(false);
    }
  }, [pendingEventMove, events, onEventUpdate, onEventsChange, toast, user?.id, user?.name]);

  // Cancel event move
  const cancelEventMove = useCallback(() => {
    setPendingEventMove(null);
    setShowEventConfirmDialog(false);
  }, []);

  return {
    activeId,
    activeBooking,
    activeEvent,
    isDraggingEvent,
    dropPreview,
    isUpdating,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    handleUndo,
    undoStack,
    // Booking confirmation dialog state
    showConfirmDialog,
    pendingMove,
    confirmMove,
    cancelMove,
    // Event confirmation dialog state
    showEventConfirmDialog,
    pendingEventMove,
    confirmEventMove,
    cancelEventMove,
  };
}

export default useCalendarDragDropEnhanced;
