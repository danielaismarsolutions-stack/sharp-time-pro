import { useMotionValue, useAnimation, PanInfo, animate } from 'framer-motion';
import { useCallback, useRef, useState, useEffect } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
  containerWidth: number;
}

interface SwipeNavigationState {
  dragX: ReturnType<typeof useMotionValue>;
  isSwipeActive: boolean;
  canSwipe: boolean;
  handlers: {
    onDragStart: () => void;
    onDrag: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  };
}

/**
 * Custom hook for implementing smooth swipe navigation with Framer Motion
 *
 * Creates a carousel-style swipe experience with:
 * - Velocity-based swipe detection (quick flicks)
 * - Distance-based swipe detection (slow drags)
 * - Smooth spring animations with snap-to-grid
 * - Coordination with other gesture systems (drag-drop, selection)
 *
 * @param options - Configuration for swipe behavior
 * @returns Motion value and state for controlling swipe animations
 */
export function useSwipeNavigationGesture({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  containerWidth,
}: UseSwipeNavigationOptions): SwipeNavigationState {
  const dragX = useMotionValue(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const isAnimatingRef = useRef(false);

  // Calculate day width (each day is 1/3 of container in 3-day view)
  const dayWidth = containerWidth / 3;

  // Full swipe distance (3 days = full container width)
  const fullSwipeDistance = containerWidth;

  // Gesture thresholds - lower for more responsive feel
  const DISTANCE_THRESHOLD = containerWidth * 0.25; // 25% of container
  const VELOCITY_THRESHOLD = 400; // px/s (lower for easier swipes)

  // Spring animation configuration - smoother and more interactive
  const SPRING_CONFIG = {
    type: "spring" as const,
    stiffness: 280,
    damping: 28,
    mass: 0.8,
  };

  const SNAP_BACK_CONFIG = {
    type: "spring" as const,
    stiffness: 350,
    damping: 35,
    mass: 0.8,
  };

  /**
   * Handle drag start - set swipe active flag
   */
  const handleDragStart = useCallback(() => {
    if (disabled || isAnimatingRef.current) return;
    setIsSwipeActive(true);
  }, [disabled]);

  /**
   * Handle drag end - determine if swipe threshold met and animate accordingly
   */
  const handleDragEnd = useCallback(
    async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled || isAnimatingRef.current) {
        setIsSwipeActive(false);
        return;
      }

      const { offset, velocity } = info;
      let shouldNavigate = false;
      let direction: 'left' | 'right' | null = null;

      // Velocity-based detection (quick flicks)
      if (Math.abs(velocity.x) > VELOCITY_THRESHOLD) {
        shouldNavigate = true;
        direction = velocity.x > 0 ? 'right' : 'left';
      }
      // Distance-based detection (slow drags)
      else if (Math.abs(offset.x) > DISTANCE_THRESHOLD) {
        shouldNavigate = true;
        direction = offset.x > 0 ? 'right' : 'left';
      }

      if (shouldNavigate && direction) {
        // Prevent multiple simultaneous animations
        isAnimatingRef.current = true;

        // Calculate target position (full container width for 3-day transition)
        const targetOffset = direction === 'right' ? fullSwipeDistance : -fullSwipeDistance;

        try {
          // Animate to target position
          await animate(dragX, targetOffset, SPRING_CONFIG);

          // Trigger navigation callback
          if (direction === 'left') {
            onSwipeLeft();
          } else {
            onSwipeRight();
          }

          // Reset position instantly (happens during date state update)
          dragX.set(0);
        } finally {
          isAnimatingRef.current = false;
          setIsSwipeActive(false);
        }
      } else {
        // Threshold not met - snap back to center
        isAnimatingRef.current = true;

        try {
          await animate(dragX, 0, SNAP_BACK_CONFIG);
        } finally {
          isAnimatingRef.current = false;
          setIsSwipeActive(false);
        }
      }
    },
    [disabled, fullSwipeDistance, DISTANCE_THRESHOLD, dragX, onSwipeLeft, onSwipeRight]
  );

  /**
   * Handle drag motion - could add haptic feedback or visual effects here
   */
  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
      // Currently just letting Framer Motion handle the drag
      // Could add haptic feedback or other effects here
    },
    []
  );

  // Reset position when disabled changes
  useEffect(() => {
    if (disabled) {
      dragX.set(0);
      setIsSwipeActive(false);
    }
  }, [disabled, dragX]);

  return {
    dragX,
    isSwipeActive,
    canSwipe: !disabled && !isAnimatingRef.current,
    handlers: {
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
  };
}

/**
 * Props to spread onto the motion.div container
 */
export interface SwipeNavigationProps {
  style: { x: ReturnType<typeof useMotionValue>; display: string };
  drag: "x" | false;
  dragConstraints: { left: number; right: number };
  dragElastic: number;
  onDragStart: () => void;
  onDrag: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

/**
 * Helper function to generate props for motion.div
 */
export function getSwipeNavigationProps(
  dragX: ReturnType<typeof useMotionValue>,
  canSwipe: boolean,
  dayWidth: number,
  onDragStart: () => void,
  onDrag: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void,
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void
): SwipeNavigationProps {
  return {
    style: { x: dragX, display: 'flex' },
    drag: canSwipe ? "x" : false,
    dragConstraints: { left: -dayWidth * 2, right: 0 },
    dragElastic: 0.1,
    onDragStart,
    onDrag,
    onDragEnd,
  };
}
