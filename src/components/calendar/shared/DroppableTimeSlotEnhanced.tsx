// Enhanced droppable time slot with 15-minute visual guides
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableTimeSlotEnhancedProps {
  id: string;
  hour: number;
  date: string;
  hourHeight: number;
  children?: React.ReactNode;
  className?: string;
  isDropTarget?: boolean;
  previewTime?: string | null;
  hasConflict?: boolean;
}

export function DroppableTimeSlotEnhanced({
  id,
  hour,
  date,
  hourHeight,
  children,
  className,
  isDropTarget = false,
  previewTime,
  hasConflict = false,
}: DroppableTimeSlotEnhancedProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { 
      hour, 
      date,
      relativeY: 0, // Will be calculated during drag
    },
  });
  
  const quarterHeight = hourHeight / 4;
  
  // Calculate preview line position based on preview time
  const getPreviewLineTop = (): number => {
    if (!previewTime) return -100;
    const [hours, minutes] = previewTime.split(':').map(Number);
    if (hours !== hour) return -100;
    return (minutes / 60) * hourHeight;
  };
  
  const previewLineTop = getPreviewLineTop();
  const showPreviewLine = isDropTarget && previewTime && previewLineTop >= 0;
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-b border-border transition-colors relative',
        isOver && !hasConflict && 'bg-primary/10',
        isOver && hasConflict && 'bg-destructive/10',
        className
      )}
      style={{ height: hourHeight }}
    >
      {/* 15-minute interval lines */}
      <div 
        className="absolute left-0 right-0 border-t border-dashed border-border/20 pointer-events-none"
        style={{ top: quarterHeight }}
      />
      <div 
        className="absolute left-0 right-0 border-t border-dashed border-border/40 pointer-events-none"
        style={{ top: quarterHeight * 2 }}
      />
      <div 
        className="absolute left-0 right-0 border-t border-dashed border-border/20 pointer-events-none"
        style={{ top: quarterHeight * 3 }}
      />
      
      {/* Drop preview indicator */}
      {showPreviewLine && (
        <div 
          className={cn(
            'absolute left-0 right-0 h-1 transition-all duration-150 pointer-events-none z-20',
            hasConflict 
              ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
              : 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]'
          )}
          style={{ top: previewLineTop }}
        >
          {/* Time label */}
          <div 
            className={cn(
              'absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-bold shadow-md whitespace-nowrap',
              hasConflict 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-primary text-primary-foreground'
            )}
          >
            {hasConflict ? '⚠️ ' : ''}Mover a {previewTime}
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}

export default DroppableTimeSlotEnhanced;
