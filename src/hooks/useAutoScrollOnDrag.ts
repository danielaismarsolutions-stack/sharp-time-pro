import { useRef, useEffect } from 'react';

interface AutoScrollOptions {
  /** Pixels from edge to start scrolling (default 80) */
  edgeThreshold?: number;
  /** Max pixels per animation frame (default 15) */
  maxSpeed?: number;
}

/**
 * Auto-scrolls a container when the pointer is near its top or bottom edge
 * during a drag operation. Tracks pointer position via global listeners
 * and uses requestAnimationFrame for smooth scrolling.
 */
export function useAutoScrollOnDrag(
  scrollRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  options: AutoScrollOptions = {}
) {
  const { edgeThreshold = 80, maxSpeed = 15 } = options;
  const rafRef = useRef<number>(0);
  const pointerYRef = useRef<number>(0);
  // Guard: don't auto-scroll until we've received at least one pointer/touch
  // move event after activation. Prevents scrolling based on stale y=0 value
  // when the user's finger is stationary (e.g. during hold-to-create).
  const hasReceivedEventRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isActive) return;

    hasReceivedEventRef.current = false;

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      pointerYRef.current = e.clientY;
      hasReceivedEventRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        pointerYRef.current = e.touches[0].clientY;
        hasReceivedEventRef.current = true;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove);

    const scrollLoop = () => {
      const container = scrollRef.current;
      if (!container || !hasReceivedEventRef.current) {
        rafRef.current = requestAnimationFrame(scrollLoop);
        return;
      }

      const rect = container.getBoundingClientRect();
      const y = pointerYRef.current;

      let delta = 0;

      if (y < rect.top + edgeThreshold) {
        // Pointer is near or above the top edge → scroll up
        const distIntoZone = rect.top + edgeThreshold - y;
        const intensity = Math.min(distIntoZone / edgeThreshold, 1);
        delta = -maxSpeed * intensity;
      } else if (y > rect.bottom - edgeThreshold) {
        // Pointer is near or below the bottom edge → scroll down
        const distIntoZone = y - (rect.bottom - edgeThreshold);
        const intensity = Math.min(distIntoZone / edgeThreshold, 1);
        delta = maxSpeed * intensity;
      }

      if (delta !== 0) {
        container.scrollTop += delta;
      }

      rafRef.current = requestAnimationFrame(scrollLoop);
    };

    rafRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isActive, scrollRef, edgeThreshold, maxSpeed]);
}
