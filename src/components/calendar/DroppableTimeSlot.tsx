import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DroppableTimeSlotProps {
  hour: number;
  isDropTarget: boolean;
  targetMinute?: number;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function DroppableTimeSlot({
  hour,
  isDropTarget,
  targetMinute,
  onClick,
  children,
}: DroppableTimeSlotProps) {
  return (
    <div
      className={cn(
        'h-16 border-b border-border/40 transition-colors duration-200 relative',
        isDropTarget && 'bg-primary/10'
      )}
      onClick={onClick}
    >
      {/* 30-minute line */}
      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/20" />
      
      {/* Drop indicator */}
      <AnimatePresence>
        {isDropTarget && targetMinute !== undefined && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.8 }}
            className="absolute left-1 right-1 h-1 rounded-full bg-primary shadow-lg shadow-primary/50"
            style={{ top: `${(targetMinute / 60) * 100}%` }}
          />
        )}
      </AnimatePresence>
      
      {children}
    </div>
  );
}
