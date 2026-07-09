import { useState, useCallback, useRef, useEffect } from 'react';
import { useAutoScrollOnDrag } from './useAutoScrollOnDrag';
import { yToStartTime, yToEndTime } from '@/components/calendar/shared/slotTimeUtils';

interface SelectionStart {
  date: Date;
  y: number;
}

interface UseSlotSelectionOptions {
  hourHeight: number;
  startHour?: number;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  isDragging?: boolean; // dnd-kit drag in progress
  onSlotSelect: (date: Date, startTime: string, endTime?: string) => void;
}

/**
 * Reusable hook for click-to-create and drag-to-select time slots
 * in calendar grid views (Day, Week, 3-Day).
 */
export function useSlotSelection({
  hourHeight,
  startHour = 0,
  scrollContainerRef,
  isDragging = false,
  onSlotSelect,
}: UseSlotSelectionOptions) {
  const [selectionStart, setSelectionStart] = useState<SelectionStart | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const dragJustCompletedRef = useRef(false);
  const activeDayColumnRef = useRef<HTMLDivElement | null>(null);
  const lastPointerYRef = useRef<number>(0);
  const touchStartRef = useRef<{
    clientX: number;
    clientY: number;
    date: Date;
    gridY: number;
    rectTop: number;
  } | null>(null);
  const touchModeRef = useRef<'undetermined' | 'selecting' | 'scrolling'>('undetermined');
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fallbackScrollRef = useRef<HTMLElement | null>(null);
  const effectiveScrollRef = scrollContainerRef ?? fallbackScrollRef;

  // Prevent page scrolling while selecting on mobile
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

  // Auto-scroll while selecting
  useAutoScrollOnDrag(effectiveScrollRef, isSelecting);

  // Update selectionEnd when container scrolls during selection
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

  // Convert Y position to time string
  const yToTime = useCallback(
    (y: number): string => yToStartTime(y, hourHeight, startHour),
    [hourHeight, startHour]
  );

  // End of a drag selection may reach midnight (mapped to 23:59)
  const yToSelectionEnd = useCallback(
    (y: number): string => yToEndTime(y, hourHeight, startHour),
    [hourHeight, startHour]
  );

  // Click handler
  const handleSlotClick = useCallback((date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (dragJustCompletedRef.current) {
      dragJustCompletedRef.current = false;
      return;
    }
    if (isSelecting || isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = yToTime(y);
    onSlotSelect(date, time);
  }, [isSelecting, isDragging, yToTime, onSlotSelect]);

  // Mouse drag start
  const handleMouseDown = useCallback((date: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const target = e.target as HTMLElement;
    if (target.closest?.('[aria-roledescription="draggable"]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    activeDayColumnRef.current = e.currentTarget;
    lastPointerYRef.current = e.clientY;
    setSelectionStart({ date, y });
    setSelectionEnd(y);
    setIsSelecting(true);
  }, [isDragging]);

  // Mouse drag move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || isDragging) return;
    lastPointerYRef.current = e.clientY;
    const target = activeDayColumnRef.current || e.currentTarget;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelectionEnd(y);
  }, [isSelecting, selectionStart, isDragging]);

  // Mouse drag end
  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd !== null) {
      const startTime = yToTime(Math.min(selectionStart.y, selectionEnd));
      const endTime = yToSelectionEnd(Math.max(selectionStart.y, selectionEnd));
      if (startTime !== endTime) {
        dragJustCompletedRef.current = true;
        onSlotSelect(selectionStart.date, startTime, endTime);
      }
    }
    activeDayColumnRef.current = null;
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [isSelecting, selectionStart, selectionEnd, yToTime, yToSelectionEnd, onSlotSelect]);

  // Touch start (mobile) - 200ms hold delay
  const handleTouchStart = useCallback((date: Date, e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging || e.touches.length > 1) return;
    const target = e.target as HTMLElement;
    if (target.closest?.('[aria-roledescription="draggable"]')) return;

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

  // Touch move
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || isDragging) return;
    if (e.touches.length > 1) {
      if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
      touchModeRef.current = 'scrolling';
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      return;
    }
    const touch = e.touches[0];
    if (touchModeRef.current === 'undetermined') {
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
      const target = activeDayColumnRef.current;
      const y = target
        ? touch.clientY - target.getBoundingClientRect().top
        : touch.clientY - touchStartRef.current.rectTop;
      setSelectionEnd(y);
    }
  }, [isDragging]);

  // Touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
    if (touchModeRef.current === 'selecting' && selectionStart && selectionEnd !== null) {
      const startTime = yToTime(Math.min(selectionStart.y, selectionEnd));
      const endTime = yToSelectionEnd(Math.max(selectionStart.y, selectionEnd));
      if (startTime !== endTime) {
        e.preventDefault();
        onSlotSelect(selectionStart.date, startTime, endTime);
      }
    }
    touchStartRef.current = null;
    touchModeRef.current = 'undetermined';
    activeDayColumnRef.current = null;
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [selectionStart, selectionEnd, yToTime, yToSelectionEnd, onSlotSelect]);

  // Selection overlay style
  const getSelectionStyle = useCallback(() => {
    if (!selectionStart || selectionEnd === null) return null;
    const top = Math.min(selectionStart.y, selectionEnd);
    const height = Math.abs(selectionEnd - selectionStart.y);
    return { top, height };
  }, [selectionStart, selectionEnd]);

  // Get time range text for the selection overlay label
  const getSelectionTimeRange = useCallback(() => {
    if (!selectionStart || selectionEnd === null) return '';
    return `${yToTime(Math.min(selectionStart.y, selectionEnd))} - ${yToSelectionEnd(Math.max(selectionStart.y, selectionEnd))}`;
  }, [selectionStart, selectionEnd, yToTime, yToSelectionEnd]);

  return {
    isSelecting,
    selectionStart,
    selectionEnd,
    getSelectionStyle,
    getSelectionTimeRange,
    // Event handlers to spread on the day column div
    handleSlotClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
