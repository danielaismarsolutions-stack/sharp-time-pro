import { useEffect, useRef, useCallback } from 'react';

/**
 * Auto-scrolls a container to the current time position when the view loads,
 * when switching views, and when the page regains focus / visibility.
 * Scrolls to ~1 hour before the current time for context.
 */
export function useAutoScrollToNow(
  startHour: number,
  hourHeight: number,
  deps: unknown[] = []
) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToNow = useCallback(() => {
    if (!scrollRef.current) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Calculate scroll position: 1 hour before current time
    const hoursFromStart = currentHour - startHour - 1;
    if (hoursFromStart <= 0) return;

    const scrollTop = (hoursFromStart + currentMinutes / 60) * hourHeight;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
    });
  }, [startHour, hourHeight]);

  // Scroll on mount and when deps change (view switch, etc.)
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToNow();
    }, 150);
    return () => clearTimeout(timer);
  }, [scrollToNow, ...deps]);

  // Re-scroll when page becomes visible again (user switches back to tab / app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to let the browser settle
        setTimeout(scrollToNow, 300);
      }
    };

    const handleFocus = () => {
      setTimeout(scrollToNow, 300);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [scrollToNow]);

  return scrollRef;
}
