// Mobile swipe hook for calendar navigation
import { useCallback, useRef } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  minDistance?: number; // Minimum distance to consider it a swipe (not a tap)
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  minDistance = 30, // Must move at least 30px to be considered a swipe
}: UseSwipeOptions): SwipeHandlers {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const hasMoved = useRef<boolean>(false);
  
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null;
    hasMoved.current = false;
  }, []);
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    touchEndX.current = e.touches[0].clientX;
    
    // Check if we've moved enough to consider it a swipe
    const deltaX = Math.abs(touchEndX.current - touchStartX.current);
    const deltaY = touchStartY.current !== null 
      ? Math.abs(e.touches[0].clientY - touchStartY.current) 
      : 0;
    
    // Only mark as moved if horizontal movement is significant and greater than vertical
    if (deltaX > minDistance && deltaX > deltaY) {
      hasMoved.current = true;
    }
  }, [minDistance]);
  
  const onTouchEnd = useCallback(() => {
    // Only trigger swipe if user actually moved their finger significantly
    if (touchStartX.current === null || touchEndX.current === null || !hasMoved.current) {
      // This was a tap, not a swipe - don't navigate
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      hasMoved.current = false;
      return;
    }
    
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeLeft) {
        // Swiped left - go to next
        onSwipeLeft();
      } else if (diff < 0 && onSwipeRight) {
        // Swiped right - go to previous
        onSwipeRight();
      }
    }
    
    // Reset all values
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    hasMoved.current = false;
  }, [threshold, onSwipeLeft, onSwipeRight]);
  
  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default useSwipeGesture;
