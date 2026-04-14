// Enhanced drag-and-drop hook with 15-minute snapping, barber schedule validation, and business hours
// Supports confirmation dialog flow: drop -> show dialog -> confirm/cancel
// Supports both bookings and calendar events
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { parse, format, addMinutes, differenceInMinutes, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Barber, BarberSchedule } from '@/types/barber';
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
  hasConflict: boolean;
  conflictingBookings: string[];
  scheduleError?: string;
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

// Snap to nearest 15-minute interval
export function snapToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

// Calculate time from Y position
export function calculateTimeFromY(
  y: number,
  hourHeight: number,
  startHour: number = 8
): { hours: number; minutes: number; timeString: string } {
  const pixelsPerMinute = hourHeight / 60;
  const totalMinutes = Math.max(0, y / pixelsPerMinute);
  const snappedMinutes = snapToQuarterHour(totalMinutes);

  const hours = Math.floor(snappedMinutes / 60) + startHour;
  const minutes = snappedMinutes % 60;
  const clampedHours = Math.min(Math.max(hours, startHour), 20);

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

  const dateObj = new Date(date);
  const dayOfWeek = getDay(dateObj);
  const dayKey = DAY_OF_WEEK_TO_KEY[dayOfWeek];
  const daySchedule = barber.schedule[dayKey];

  // Check if barber has time off on this date
  const isOnTimeOff = barber.time_off.some(timeOff => {
    const startDate = new Date(timeOff.start_date);
    const endDate = new Date(timeOff.end_date);
    return dateObj >= startDate && dateObj <= endDate;
  });

  if (isOnTimeOff) {
    return {
      isAvailable: false,
      reason: `${barberName} tiene el día libre`,
    };
  }

  // Check if the day is enabled
  if (!daySchedule.enabled || daySchedule.shifts.length === 0) {
    return {
      isAvailable: false,
      reason: `${barberName} no trabaja este día`,
    };
  }

  // Parse booking times
  const bookingStart = parse(startTime.substring(0, 5), 'HH:mm', new Date());
  const bookingEnd = parse(endTime.substring(0, 5), 'HH:mm', new Date());

  // Check if the booking fits within any of the barber's shifts
  const fitsInShift = daySchedule.shifts.some(shift => {
    const shiftStart = parse(shift.start, 'HH:mm', new Date());
    const shiftEnd = parse(shift.end, 'HH:mm', new Date());
    return bookingStart >= shiftStart && bookingEnd <= shiftEnd;
  });

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDropPreview(null);

    // Haptic feedback on mobile - strong pattern to confirm drag mode activated after long-press
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 30, 40]);
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

    // Get the hour slot the user is hovering over
    const baseHour = dropData.hour;

    // Get the droppable element's rect to calculate relative position
    const overRect = over.rect;
    const dragY = event.delta.y + (event.activatorEvent as PointerEvent)?.clientY || 0;

    // Calculate relative position within the hour slot
    const relativeY = Math.max(0, Math.min(hourHeight, dragY - overRect.top));
    const minutesInSlot = (relativeY / hourHeight) * 60;
    const snappedMinutesInSlot = snapToQuarterHour(minutesInSlot);

    // Calculate final time
    const hours = baseHour;
    const minutes = snappedMinutesInSlot >= 60 ? 0 : snappedMinutesInSlot;
    const finalHours = snappedMinutesInSlot >= 60 ? Math.min(baseHour + 1, 20) : hours;

    const newStartTime = `${finalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (isDraggingEvent) {
      // Event drag move - simpler validation (no booking conflicts or barber schedule)
      const evt = activeEvent;
      if (!evt) return;

      const duration = getEventDuration(evt);
      const endDate = addMinutes(parse(newStartTime, 'HH:mm', new Date()), duration);
      const newEndTime = format(endDate, 'HH:mm');

      // Only check business hours for events
      const endHourNum = parseInt(newEndTime.split(':')[0]);
      const startHourNum = parseInt(newStartTime.split(':')[0]);
      let businessHoursError: string | undefined;
      if (startHourNum < businessOpenHour || endHourNum > businessCloseHour) {
        businessHoursError = 'Fuera del horario del negocio';
      }

      setDropPreview({
        date: dropData.date,
        time: newStartTime,
        hasConflict: !!businessHoursError,
        conflictingBookings: [],
        scheduleError: businessHoursError,
      });
    } else {
      // Booking drag move - full validation
      const booking = bookings.find(b => b.id === activeId);
      if (!booking) return;

      const duration = getBookingDuration(booking);
      const endDate = addMinutes(parse(newStartTime, 'HH:mm', new Date()), duration);
      const newEndTime = format(endDate, 'HH:mm');

      // Check for conflicts (same barber only)
      const { hasConflict, conflictingBookings } = checkConflicts(
        bookings,
        activeId,
        dropData.date,
        newStartTime,
        newEndTime,
        booking.barber
      );

      // Check barber schedule availability
      const scheduleCheck = checkBarberSchedule(
        barbers,
        booking.barber,
        dropData.date,
        newStartTime,
        newEndTime
      );

      // Check business hours
      const endHourNum = parseInt(newEndTime.split(':')[0]);
      const startHourNum = parseInt(newStartTime.split(':')[0]);
      let businessHoursError: string | undefined;
      if (startHourNum < businessOpenHour || endHourNum > businessCloseHour) {
        businessHoursError = 'Fuera del horario del negocio';
      }

      const finalScheduleError = scheduleCheck.reason || businessHoursError;

      setDropPreview({
        date: dropData.date,
        time: newStartTime,
        hasConflict: hasConflict || !scheduleCheck.isAvailable || !!businessHoursError,
        conflictingBookings: conflictingBookings.map(b => b.client_name),
        scheduleError: finalScheduleError,
      });
    }

    // Haptic feedback when snapping to a new time
    if ('vibrate' in navigator && dropPreview?.time !== newStartTime) {
      navigator.vibrate(5);
    }
  }, [activeId, isDraggingEvent, activeEvent, bookings, barbers, getBookingDuration, getEventDuration, hourHeight, dropPreview?.time, businessOpenHour, businessCloseHour]);

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

    // Use the saved preview time if available, otherwise calculate
    let newStartTime: string;
    let newDate: string;

    if (savedDropPreview?.time && savedDropPreview?.date) {
      newStartTime = `${savedDropPreview.time}:00`;
      newDate = savedDropPreview.date;
    } else {
      newStartTime = `${dropData.hour.toString().padStart(2, '0')}:00:00`;
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

      // Check business hours
      const startHourNum = parseInt(newStartTime.split(':')[0]);
      const endHourNum = parseInt(newEndTime.split(':')[0]);
      if (startHourNum < businessOpenHour || endHourNum > businessCloseHour) {
        toast({
          title: 'Fuera del horario',
          description: `El negocio opera de ${businessOpenHour}:00 a ${businessCloseHour}:00`,
          variant: 'destructive',
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
        return;
      }

      // Show event confirmation dialog
      setPendingEventMove({
        event: evt,
        oldDate: evt.event_date,
        oldStartTime: evt.start_time,
        oldEndTime: evt.end_time,
        newDate,
        newStartTime,
        newEndTime,
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

      // Check business hours
      const startHourNum = parseInt(newStartTime.split(':')[0]);
      const endHourNum = parseInt(newEndTime.split(':')[0]);
      if (startHourNum < businessOpenHour || endHourNum > businessCloseHour) {
        toast({
          title: 'Fuera del horario',
          description: `El negocio opera de ${businessOpenHour}:00 a ${businessCloseHour}:00`,
          variant: 'destructive',
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
        return;
      }

      // Check for conflicts (same barber only)
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

      // Check barber schedule availability
      const scheduleCheck = checkBarberSchedule(
        barbers,
        booking.barber,
        newDate,
        newStartTime,
        newEndTime
      );

      if (!scheduleCheck.isAvailable) {
        toast({
          title: 'Horario no disponible',
          description: scheduleCheck.reason,
          variant: 'destructive',
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
        return;
      }

      // Show booking confirmation dialog
      setPendingMove({
        booking,
        oldDate: booking.booking_date,
        oldStartTime: booking.start_time,
        oldEndTime: booking.end_time,
        newDate,
        newStartTime,
        newEndTime,
      });
      setShowConfirmDialog(true);

      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
    }
  }, [bookings, events, barbers, toast, getBookingDuration, getEventDuration, dropPreview, businessOpenHour, businessCloseHour]);

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
          message: `${user?.name || 'Usuario'} movió la cita de ${booking.client_name} (${booking.service_name}) al ${format(new Date(newDate), 'dd/MM/yyyy', { locale: es })} a las ${newStartTime.substring(0, 5)}`,
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

      toast({
        title: 'Cita movida',
        description: `${booking.client_name} → ${format(new Date(newDate), 'dd/MM')} a las ${newStartTime.substring(0, 5)}`,
        duration: 2000,
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
      setIsUpdating(true);
      setPendingMove(null);
      setShowConfirmDialog(false);
      setIsUpdating(false);
    }
  }, [pendingMove, bookings, onBookingUpdate, onBookingsChange, toast, user?.id]);

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
          message: `${user?.name || 'Usuario'} movió el evento "${evt.name}" al ${format(new Date(newDate), 'dd/MM/yyyy', { locale: es })} a las ${newStartTime.substring(0, 5)}`,
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

      toast({
        title: 'Evento movido',
        description: `${evt.name} → ${format(new Date(newDate), 'dd/MM')} a las ${newStartTime.substring(0, 5)}`,
        duration: 2000,
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
  }, [pendingEventMove, events, onEventUpdate, onEventsChange, toast, user?.id]);

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
