import { useState, useCallback, useRef } from 'react';
import { format, parse, addMinutes } from 'date-fns';
import { ApiBooking } from '@/types/api';

interface DragState {
  booking: ApiBooking | null;
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface DropTarget {
  date: Date;
  hour: number;
  minute: number;
}

export interface UseDragAndDropOptions {
  onReschedule: (bookingId: string, newDate: string, newStartTime: string, newEndTime: string) => Promise<void>;
  hourHeight?: number;
  startHour?: number;
}

export function useDragAndDrop({ onReschedule, hourHeight = 60, startHour = 8 }: UseDragAndDropOptions) {
  const [dragState, setDragState] = useState<DragState>({
    booking: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((booking: ApiBooking, e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState({
      booking,
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState((prev) => ({
      ...prev,
      currentX: clientX,
      currentY: clientY,
    }));
  }, [dragState.isDragging]);

  const handleDragEnd = useCallback(async () => {
    if (!dragState.booking || !dropTarget) {
      setDragState({
        booking: null,
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      setDropTarget(null);
      return;
    }

    const booking = dragState.booking;
    const newDate = format(dropTarget.date, 'yyyy-MM-dd');
    const newStartTime = `${dropTarget.hour.toString().padStart(2, '0')}:${dropTarget.minute.toString().padStart(2, '0')}:00`;

    // Calculate new end time based on original duration
    const originalStart = parse(booking.start_time, 'HH:mm:ss', new Date());
    const originalEnd = parse(booking.end_time, 'HH:mm:ss', new Date());
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newStartDate = parse(newStartTime, 'HH:mm:ss', new Date());
    const newEndDate = addMinutes(newStartDate, duration / 60000);
    const newEndTime = format(newEndDate, 'HH:mm:ss');

    try {
      await onReschedule(booking.id, newDate, newStartTime, newEndTime);
    } catch (error) {
      console.error('Failed to reschedule booking:', error);
    }

    setDragState({
      booking: null,
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    setDropTarget(null);
  }, [dragState.booking, dropTarget, onReschedule]);

  const calculateDropTarget = useCallback((
    e: MouseEvent | TouchEvent,
    containerRef: HTMLElement,
    date: Date
  ): DropTarget | null => {
    const rect = containerRef.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relativeY = clientY - rect.top;

    // Calculate hour and minute from Y position
    const totalMinutes = (relativeY / hourHeight) * 60;
    const hour = Math.floor(totalMinutes / 60) + startHour;
    const minute = Math.round((totalMinutes % 60) / 15) * 15; // Snap to 15-minute intervals

    if (hour < startHour || hour > 20) return null;

    return {
      date,
      hour: minute >= 60 ? hour + 1 : hour,
      minute: minute % 60,
    };
  }, [hourHeight, startHour]);

  const updateDropTarget = useCallback((target: DropTarget | null) => {
    setDropTarget(target);
  }, []);

  return {
    dragState,
    dropTarget,
    dragRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    calculateDropTarget,
    updateDropTarget,
  };
}
