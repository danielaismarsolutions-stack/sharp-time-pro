// Custom hook for calendar drag-and-drop functionality
import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { parse, format, addMinutes, differenceInMinutes } from 'date-fns';
import { ApiBooking } from '@/types/api';
import { supabaseBookingsApi, UpdateBookingData } from '@/services/supabaseBookings';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';

interface UseCalendarDragDropOptions {
  bookings: ApiBooking[];
  onBookingUpdate: (bookingId: string, updatedBooking: ApiBooking) => void;
  onBookingsChange: (updatedBookings: ApiBooking[]) => void;
}

interface UndoAction {
  bookingId: string;
  previousState: Partial<ApiBooking>;
}

export function useCalendarDragDrop({
  bookings,
  onBookingUpdate,
  onBookingsChange,
}: UseCalendarDragDropOptions) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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
      toast({ title: t('calendar.dragDrop.undone') });

      // Remove from undo stack
      setUndoStack(prev => prev.filter(a => a.bookingId !== bookingId));
    } catch (error) {
      // Rollback the rollback
      onBookingsChange(bookings);
      toast({
        title: t('calendar.dragDrop.undoError'),
        variant: 'destructive',
      });
    }
  }, [bookings, onBookingsChange, toast, t]);
  
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const bookingId = active.id as string;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Extract drop target data (hour, date)
    const dropData = over.data.current as { hour?: number; date?: string } | undefined;
    if (!dropData?.hour || !dropData?.date) return;
    
    const newHour = dropData.hour;
    const newDate = dropData.date;
    
    // Calculate new times
    const originalStart = parse(booking.start_time, 'HH:mm:ss', new Date());
    const originalEnd = parse(booking.end_time, 'HH:mm:ss', new Date());
    const duration = differenceInMinutes(originalEnd, originalStart);
    
    // Keep the same minutes, just change hour
    const newStartTime = `${newHour.toString().padStart(2, '0')}:${originalStart.getMinutes().toString().padStart(2, '0')}:00`;
    const newEndDate = addMinutes(parse(newStartTime, 'HH:mm:ss', new Date()), duration);
    const newEndTime = format(newEndDate, 'HH:mm:ss');
    
    // Check if anything changed
    if (newDate === booking.booking_date && newStartTime === booking.start_time) {
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
      // Update in Supabase
      const updated = await supabaseBookingsApi.update(bookingId, {
        booking_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });
      
      onBookingUpdate(bookingId, updated);
      
      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-9), { bookingId, previousState }]);
      
      toast({
        title: t('calendar.dragDrop.moved'),
        description: t('calendar.dragDrop.movedDescription', {
          client: booking.client_name,
          date: format(new Date(newDate), 'dd/MM'),
          time: newStartTime.substring(0, 5),
        }),
      });
    } catch (error) {
      // Rollback on error
      onBookingsChange(bookings);
      toast({
        title: t('calendar.dragDrop.moveError'),
        description: t('calendar.dragDrop.moveErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [bookings, onBookingUpdate, onBookingsChange, toast, t]);
  
  return {
    activeId,
    isUpdating,
    handleDragStart,
    handleDragEnd,
    handleUndo,
    undoStack,
  };
}

export default useCalendarDragDrop;
