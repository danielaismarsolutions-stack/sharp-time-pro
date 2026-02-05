// Hook for drag-to-select time slot creation
import { useState, useCallback, useRef, useEffect } from 'react';

export interface TimeSlotSelection {
  date: Date;
  startY: number;
  endY: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isDraggingHandle: 'top' | 'bottom' | null;
}

interface UseTimeSlotSelectionOptions {
  hourHeight: number;
  startHour: number;
  minDuration?: number; // minimum duration in minutes (default 15)
  snapInterval?: number; // snap to interval in minutes (default 15)
  onSelectionComplete?: (date: Date, startTime: string, endTime: string) => void;
}

// Snap to nearest interval (default 15 minutes)
function snapToInterval(minutes: number, interval: number = 15): number {
  return Math.round(minutes / interval) * interval;
}

// Calculate time from Y position
function calculateTimeFromY(
  y: number,
  hourHeight: number,
  startHour: number,
  snapInterval: number = 15
): { hours: number; minutes: number; timeString: string } {
  const pixelsPerMinute = hourHeight / 60;
  const totalMinutes = Math.max(0, y / pixelsPerMinute);
  const snappedMinutes = snapToInterval(totalMinutes, snapInterval);

  let hours = Math.floor(snappedMinutes / 60) + startHour;
  let minutes = snappedMinutes % 60;

  // Handle overflow
  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }

  // Clamp hours
  hours = Math.min(Math.max(hours, startHour), 23);

  return {
    hours,
    minutes,
    timeString: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
  };
}

// Calculate Y position from time
function calculateYFromTime(
  timeString: string,
  hourHeight: number,
  startHour: number
): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  const pixelsPerMinute = hourHeight / 60;
  return ((hours - startHour) * 60 + minutes) * pixelsPerMinute;
}

export function useTimeSlotSelection({
  hourHeight,
  startHour,
  minDuration = 15,
  snapInterval = 15,
  onSelectionComplete,
}: UseTimeSlotSelectionOptions) {
  const [selection, setSelection] = useState<TimeSlotSelection | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);
  const initialYRef = useRef<number>(0);

  // Calculate selection box style
  const getSelectionStyle = useCallback(() => {
    if (!selection) return null;

    const top = Math.min(selection.startY, selection.endY);
    const height = Math.abs(selection.endY - selection.startY);

    return {
      top,
      height: Math.max(height, (minDuration / 60) * hourHeight),
    };
  }, [selection, minDuration, hourHeight]);

  // Start a new selection
  const startSelection = useCallback((date: Date, clientY: number, containerRect: DOMRect) => {
    const y = clientY - containerRect.top;
    const timeInfo = calculateTimeFromY(y, hourHeight, startHour, snapInterval);
    const snappedY = calculateYFromTime(timeInfo.timeString, hourHeight, startHour);

    // Calculate default end time (30 min later)
    const defaultEndMinutes = timeInfo.hours * 60 + timeInfo.minutes + 30;
    const endHours = Math.floor(defaultEndMinutes / 60);
    const endMinutes = defaultEndMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    const endY = calculateYFromTime(endTime, hourHeight, startHour);

    setSelection({
      date,
      startY: snappedY,
      endY,
      startTime: timeInfo.timeString,
      endTime,
      isActive: true,
      isDraggingHandle: null,
    });

    isPointerDownRef.current = true;
    initialYRef.current = snappedY;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [hourHeight, startHour, snapInterval]);

  // Start dragging a handle
  const startDraggingHandle = useCallback((handle: 'top' | 'bottom', e: React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!selection) return;

    setSelection(prev => prev ? { ...prev, isDraggingHandle: handle } : null);
    isPointerDownRef.current = true;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }, [selection]);

  // Update selection while dragging
  const updateSelection = useCallback((clientY: number, containerRect: DOMRect) => {
    if (!selection || !isPointerDownRef.current) return;

    const y = Math.max(0, clientY - containerRect.top);
    const timeInfo = calculateTimeFromY(y, hourHeight, startHour, snapInterval);
    const snappedY = calculateYFromTime(timeInfo.timeString, hourHeight, startHour);

    setSelection(prev => {
      if (!prev) return null;

      if (prev.isDraggingHandle === 'top') {
        // Dragging top handle - adjust start time
        const newStartY = Math.min(snappedY, prev.endY - (minDuration / 60) * hourHeight);
        const newTimeInfo = calculateTimeFromY(newStartY, hourHeight, startHour, snapInterval);
        return {
          ...prev,
          startY: newStartY,
          startTime: newTimeInfo.timeString,
        };
      } else if (prev.isDraggingHandle === 'bottom') {
        // Dragging bottom handle - adjust end time
        const newEndY = Math.max(snappedY, prev.startY + (minDuration / 60) * hourHeight);
        const newTimeInfo = calculateTimeFromY(newEndY, hourHeight, startHour, snapInterval);
        return {
          ...prev,
          endY: newEndY,
          endTime: newTimeInfo.timeString,
        };
      } else {
        // Initial drag - adjust end position based on drag direction
        const minHeightPx = (minDuration / 60) * hourHeight;

        if (snappedY > initialYRef.current) {
          // Dragging down
          const newEndY = Math.max(snappedY, prev.startY + minHeightPx);
          const newTimeInfo = calculateTimeFromY(newEndY, hourHeight, startHour, snapInterval);
          return {
            ...prev,
            endY: newEndY,
            endTime: newTimeInfo.timeString,
          };
        } else {
          // Dragging up - swap start and end
          const newStartY = snappedY;
          const newStartTimeInfo = calculateTimeFromY(newStartY, hourHeight, startHour, snapInterval);
          return {
            ...prev,
            startY: newStartY,
            startTime: newStartTimeInfo.timeString,
            endY: Math.max(initialYRef.current, newStartY + minHeightPx),
          };
        }
      }
    });

    // Haptic feedback on snap
    if ('vibrate' in navigator) {
      navigator.vibrate(3);
    }
  }, [selection, hourHeight, startHour, snapInterval, minDuration]);

  // End selection
  const endSelection = useCallback(() => {
    isPointerDownRef.current = false;

    if (selection) {
      setSelection(prev => prev ? { ...prev, isDraggingHandle: null } : null);
    }
  }, [selection]);

  // Complete selection and trigger callback
  const completeSelection = useCallback(() => {
    if (selection && onSelectionComplete) {
      // Ensure start time is before end time
      const startMinutes = parseInt(selection.startTime.split(':')[0]) * 60 + parseInt(selection.startTime.split(':')[1]);
      const endMinutes = parseInt(selection.endTime.split(':')[0]) * 60 + parseInt(selection.endTime.split(':')[1]);

      if (startMinutes < endMinutes) {
        onSelectionComplete(selection.date, selection.startTime, selection.endTime);
      }
    }
  }, [selection, onSelectionComplete]);

  // Cancel selection
  const cancelSelection = useCallback(() => {
    setSelection(null);
    isPointerDownRef.current = false;
  }, []);

  // Handle pointer/touch move events globally when dragging
  useEffect(() => {
    if (!selection?.isDraggingHandle && !isPointerDownRef.current) return;

    const handleMove = (e: PointerEvent | TouchEvent) => {
      if (!containerRef.current) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const containerRect = containerRef.current.getBoundingClientRect();
      updateSelection(clientY, containerRect);
    };

    const handleEnd = () => {
      endSelection();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [selection?.isDraggingHandle, updateSelection, endSelection]);

  return {
    selection,
    containerRef,
    getSelectionStyle,
    startSelection,
    startDraggingHandle,
    updateSelection,
    endSelection,
    completeSelection,
    cancelSelection,
    setSelection,
  };
}

export default useTimeSlotSelection;
