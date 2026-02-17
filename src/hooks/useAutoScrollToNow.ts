import { useEffect, useRef } from 'react';

/**
 * Auto-scrolls a container to the current time position when the view loads.
 * Scrolls to ~1 hour before the current time for context.
 */
export function useAutoScrollToNow(
  startHour: number,
  hourHeight: number,
  deps: unknown[] = []
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    hasScrolled.current = false;
  }, deps);

  useEffect(() => {
    if (hasScrolled.current || !scrollRef.current) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Calculate scroll position: 1 hour before current time
    const hoursFromStart = currentHour - startHour - 1;
    if (hoursFromStart <= 0) return;

    const scrollTop = (hoursFromStart + currentMinutes / 60) * hourHeight;

    // Use a short timeout to ensure the view's DOM has fully rendered
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        hasScrolled.current = true;
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [startHour, hourHeight, ...deps]);

  return scrollRef;
}
