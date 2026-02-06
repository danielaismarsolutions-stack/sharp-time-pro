// Enhanced droppable time slot with 15-minute visual guides, business hours validation, and drop zone feedback
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Ban, Check } from 'lucide-react';

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
  scheduleError?: string;
  isOutsideBusinessHours?: boolean;
  isDragging?: boolean;
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
  scheduleError,
  isOutsideBusinessHours = false,
  isDragging = false,
}: DroppableTimeSlotEnhancedProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      hour,
      date,
    },
  });

  const quarterHeight = hourHeight / 4;
  const hasError = hasConflict || !!scheduleError;

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
        'border-b border-border transition-colors duration-200 relative',
        // When user is dragging - show zone validity
        isDragging && isOutsideBusinessHours && 'bg-muted/40',
        // Active hover states during drag
        isOver && !hasError && !isOutsideBusinessHours && 'bg-emerald-500/10',
        isOver && hasError && 'bg-destructive/10',
        isOver && isOutsideBusinessHours && 'bg-destructive/5',
        className
      )}
      style={{ height: hourHeight }}
    >
      {/* 15-minute interval guide lines - more visible during drag */}
      <div
        className={cn(
          'absolute left-0 right-0 border-t border-dashed pointer-events-none transition-opacity duration-200',
          isDragging ? 'border-border/40 opacity-100' : 'border-border/20 opacity-60'
        )}
        style={{ top: quarterHeight }}
      />
      <div
        className={cn(
          'absolute left-0 right-0 border-t border-dashed pointer-events-none transition-opacity duration-200',
          isDragging ? 'border-border/50 opacity-100' : 'border-border/40 opacity-60'
        )}
        style={{ top: quarterHeight * 2 }}
      />
      <div
        className={cn(
          'absolute left-0 right-0 border-t border-dashed pointer-events-none transition-opacity duration-200',
          isDragging ? 'border-border/40 opacity-100' : 'border-border/20 opacity-60'
        )}
        style={{ top: quarterHeight * 3 }}
      />

      {/* Outside business hours overlay */}
      {isDragging && isOutsideBusinessHours && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
            <Ban className="w-3 h-3" />
            <span className="text-[9px] font-medium">Cerrado</span>
          </div>
        </div>
      )}

      {/* Valid drop zone indicator when hovering */}
      {isOver && !hasError && !isOutsideBusinessHours && (
        <div className="absolute top-1 right-1 pointer-events-none z-20">
          <div className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Invalid drop zone indicator when hovering */}
      {isOver && (hasError || isOutsideBusinessHours) && (
        <div className="absolute top-1 right-1 pointer-events-none z-20">
          <div className="w-4 h-4 rounded-full bg-destructive/80 flex items-center justify-center">
            <Ban className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Drop preview indicator line with smooth snapping */}
      {showPreviewLine && (
        <div
          className={cn(
            'absolute left-0 right-0 h-0.5 pointer-events-none z-20',
            'transition-all duration-150 ease-out',
            hasError
              ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
          )}
          style={{ top: previewLineTop }}
        >
          {/* Time label badge */}
          <div
            className={cn(
              'absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-bold shadow-md whitespace-nowrap',
              'transition-colors duration-150',
              hasError
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-emerald-500 text-white'
            )}
          >
            {hasError ? '⚠ ' : '✓ '}
            {previewTime}
            {scheduleError && (
              <span className="ml-1 font-normal text-[10px] opacity-90">
                - {scheduleError}
              </span>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

export default DroppableTimeSlotEnhanced;
