import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { addDays } from 'date-fns';

interface ThreeDayCarouselProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isDragging?: boolean;  // From @dnd-kit, disables pan when dragging bookings
  isSelecting?: boolean; // From drag-to-create, disables pan when selecting
  children: (periodStartDate: Date, isActive: boolean) => ReactNode;
}

export function ThreeDayCarousel({
  currentDate,
  onDateChange,
  isDragging = false,
  isSelecting = false,
  children,
}: ThreeDayCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [offset, setOffset] = useState(0); // -1 = prev, 0 = current, 1 = next

  // Calculate container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate periods to render (previous, current, next)
  const periods = [
    addDays(currentDate, -3), // Previous 3-day period
    currentDate,               // Current 3-day period
    addDays(currentDate, 3),   // Next 3-day period
  ];

  // Handle drag gesture
  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Disable if booking drag or selection active
    if (isDragging || isSelecting || isAnimating) return;

    // Detect vertical vs horizontal movement
    const deltaX = Math.abs(info.delta.x);
    const deltaY = Math.abs(info.delta.y);

    // If vertical movement dominates, don't pan (let scroll work)
    if (deltaY > deltaX && deltaY > 15) {
      return;
    }

    // Track horizontal drag position
    setDragX(info.offset.x);
  }, [isDragging, isSelecting, isAnimating]);

  // Handle drag end - determine snap direction
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Disable if booking drag or selection active
    if (isDragging || isSelecting || isAnimating) return;

    const threshold = containerWidth * 0.25; // 25% of width
    const velocityThreshold = 500; // px/s

    let direction = 0; // 0 = stay, -1 = previous, 1 = next

    // Check velocity first
    if (Math.abs(info.velocity.x) > velocityThreshold) {
      direction = info.velocity.x > 0 ? -1 : 1;
    }
    // Then check distance
    else if (Math.abs(info.offset.x) > threshold) {
      direction = info.offset.x > 0 ? -1 : 1;
    }

    // Reset drag position
    setDragX(0);

    // If direction changed, navigate
    if (direction !== 0) {
      setIsAnimating(true);
      // Calculate new date (direction: -1 = previous 3 days, 1 = next 3 days)
      const newDate = addDays(currentDate, direction * 3);
      onDateChange(newDate);

      // Reset animation flag after spring animation completes (~400ms)
      setTimeout(() => setIsAnimating(false), 400);
    }
  }, [isDragging, isSelecting, isAnimating, containerWidth, currentDate, onDateChange]);

  // Calculate transform for carousel position
  const calculateTransform = () => {
    // Base position: show current period (middle panel)
    const baseOffset = -containerWidth;
    // Add drag offset
    return baseOffset + dragX;
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative">
      <motion.div
        drag={!isDragging && !isSelecting && !isAnimating ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        dragDirectionLock={true}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: calculateTransform() }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 300,
        }}
        className="flex"
        style={{
          width: `${containerWidth * 3}px`,
          willChange: 'transform',
          transform: 'translateZ(0)', // GPU acceleration
        }}
      >
        {periods.map((periodStart, index) => (
          <div
            key={`${periodStart.toISOString()}-${index}`}
            className="flex-shrink-0 flex flex-col"
            style={{ width: containerWidth }}
          >
            {children(periodStart, index === 1)} {/* index 1 is the active/current period */}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
