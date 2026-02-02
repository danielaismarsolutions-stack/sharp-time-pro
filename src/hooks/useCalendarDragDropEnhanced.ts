// Enhanced drag-and-drop hook with 15-minute snapping
import { useState, useCallback, useMemo } from 'react';
import { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { parse, format, addMinutes, differenceInMinutes } from 'date-fns';
import { ApiBooking } from '@/types/api';
import { supabaseBookingsApi } from '@/services/supabaseBookings';
import { useToast } from '@/hooks/use-toast';

interface UseCalendarDragDropEnhancedOptions {
  bookings: ApiBooking[];
  onBookingUpdate: (bookingId: string, updatedBooking: ApiBooking) => void;
  onBookingsChange: (updatedBookings: ApiBooking[]) => void;
  hourHeight: number;
  startHour?: number;
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
}

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

export function useCalendarDragDropEnhanced({
  bookings,
  onBookingUpdate,
  onBookingsChange,
  hourHeight,
  startHour = 8,
}: UseCalendarDragDropEnhancedOptions) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get active booking
  const activeBooking = useMemo(() => {
    if (!activeId) return null;
    return bookings.find(b => b.id === activeId) || null;
  }, [activeId, bookings]);
  
  // Calculate booking duration
  const getBookingDuration = useCallback((booking: ApiBooking): number => {
    const start = parse(booking.start_time, 'HH:mm:ss', new Date());
    const end = parse(booking.end_time, 'HH:mm:ss', new Date());
    return differenceInMinutes(end, start);
  }, []);
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDropPreview(null);
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);
  
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over } = event;
    if (!over || !activeId) return;
    
    const booking = bookings.find(b => b.id === activeId);
    if (!booking) return;
    
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
    
    setDropPreview({
      date: dropData.date,
      time: newStartTime,
      hasConflict,
      conflictingBookings: conflictingBookings.map(b => b.client_name),
    });
    
    // Haptic feedback when snapping to a new time
    if ('vibrate' in navigator && dropPreview?.time !== newStartTime) {
      navigator.vibrate(5);
    }
  }, [activeId, bookings, getBookingDuration, hourHeight, dropPreview?.time]);
  
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
      await supabaseBookingsApi.update(bookingId, previousState as any);
      toast({ title: 'Cambio deshecho' });
      setUndoStack(prev => prev.filter(a => a.bookingId !== bookingId));
    } catch (error) {
      onBookingsChange(bookings);
      toast({ title: 'Error al deshacer', variant: 'destructive' });
    }
  }, [bookings, onBookingsChange, toast]);
  
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const savedDropPreview = dropPreview; // Capture before resetting
    setActiveId(null);
    setDropPreview(null);
    
    if (!over) return;
    
    const bookingId = active.id as string;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
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
      // Fallback: use the hour from the drop target
      newStartTime = `${dropData.hour.toString().padStart(2, '0')}:00:00`;
      newDate = dropData.date;
    }
    
    const duration = getBookingDuration(booking);
    const endDate = addMinutes(parse(newStartTime, 'HH:mm:ss', new Date()), duration);
    const newEndTime = format(endDate, 'HH:mm:ss');
    
    // Check if anything changed
    if (newDate === booking.booking_date && newStartTime === booking.start_time) {
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
      return;
    }
    
    // Store previous state for undo
    const previousState = {
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
    };
    
    // Optimistic update
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
    setIsUpdating(true);
    
    try {
      const updated = await supabaseBookingsApi.update(bookingId, {
        booking_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });
      
      onBookingUpdate(bookingId, updated);
      setUndoStack(prev => [...prev.slice(-9), { bookingId, previousState }]);
      
      // Haptic feedback on success
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
      
      toast({
        title: 'Cita movida',
        description: `${booking.client_name} → ${format(new Date(newDate), 'dd/MM')} a las ${newStartTime.substring(0, 5)}`,
      });
    } catch (error) {
      onBookingsChange(bookings);
      toast({
        title: 'Error al mover cita',
        description: 'No se pudo actualizar la cita',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [bookings, onBookingUpdate, onBookingsChange, toast, getBookingDuration, dropPreview]);
  
  return {
    activeId,
    activeBooking,
    dropPreview,
    isUpdating,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    handleUndo,
    undoStack,
  };
}

export default useCalendarDragDropEnhanced;
