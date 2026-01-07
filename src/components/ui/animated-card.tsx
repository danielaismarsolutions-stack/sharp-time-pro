import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeEnabled?: boolean;
  delay?: number;
}

export function AnimatedCard({
  children,
  className,
  onClick,
  onSwipeLeft,
  onSwipeRight,
  swipeEnabled = false,
  delay = 0,
}: AnimatedCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const rotateZ = useTransform(x, [-150, 0, 150], [-5, 0, 5]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x < -100 && onSwipeLeft) {
      onSwipeLeft();
    } else if (info.offset.x > 100 && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: delay * 0.05 }}
      whileTap={{ scale: swipeEnabled ? 1 : 0.98 }}
      drag={swipeEnabled ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      style={swipeEnabled ? { x, opacity, rotateZ } : {}}
      onClick={() => !isDragging && onClick?.()}
      className={cn(
        'touch-manipulation cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export function PullToRefresh({
  onRefresh,
  children,
  isRefreshing,
}: {
  onRefresh: () => void;
  children: ReactNode;
  isRefreshing: boolean;
}) {
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 80], [0, 1]);
  const [isPulling, setIsPulling] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsPulling(false);
    if (info.offset.y > 80) {
      onRefresh();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        style={{ opacity: pullProgress, y: useTransform(y, [0, 80], [-40, 0]) }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center h-10 z-10"
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragStart={() => setIsPulling(true)}
        onDragEnd={handleDragEnd}
        style={{ y: isPulling ? y : 0 }}
        className="touch-pan-x"
      >
        {children}
      </motion.div>
    </div>
  );
}
