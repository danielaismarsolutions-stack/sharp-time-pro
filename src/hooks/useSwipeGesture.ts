// Mobile swipe hook for calendar navigation
import { useCallback, useRef, useState } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: UseSwipeOptions): SwipeHandlers {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    touchEndX.current = e.touches[0].clientX;
  }, [isSwiping]);
  
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    
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
    
    setIsSwiping(false);
    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [isSwiping, threshold, onSwipeLeft, onSwipeRight]);
  
  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default useSwipeGesture;
