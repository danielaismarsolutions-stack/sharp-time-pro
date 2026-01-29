// Droppable time slot for drag-and-drop
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableTimeSlotProps {
  id: string;
  hour: number;
  date: string;
  children?: React.ReactNode;
  className?: string;
  showHalfHourLine?: boolean;
}

export function DroppableTimeSlot({
  id,
  hour,
  date,
  children,
  className,
  showHalfHourLine = true,
}: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { hour, date },
  });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-b border-border transition-colors relative',
        isOver && 'bg-primary/10 ring-2 ring-primary/30 ring-inset',
        className
      )}
    >
      {/* Half-hour line */}
      {showHalfHourLine && (
        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/30 pointer-events-none" />
      )}
      {children}
    </div>
  );
}

export default DroppableTimeSlot;
