// Enhanced droppable time slot with 15-minute visual guides, business hours validation, and drop zone feedback
// Shows time snap indicators and a ghost preview card at the drop target
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
  /** Duration of the dragged booking in minutes, for preview card sizing */
  draggedBookingDuration?: number;
  /** Client name of the dragged booking, for preview card */
  draggedBookingClientName?: string;
  /** Service name of the dragged booking */
  draggedBookingServiceName?: string;
  /** Color classes for the dragged booking's barber */
  draggedBookingColorClasses?: { bg: string; border: string; text: string };
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
  draggedBookingDuration,
  draggedBookingClientName,
  draggedBookingServiceName,
  draggedBookingColorClasses,
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

  // Calculate ghost preview card height based on duration
  const previewCardHeight = draggedBookingDuration
    ? (draggedBookingDuration / 60) * hourHeight
    : quarterHeight * 2; // default 30 min

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
      {/* 15-minute interval guide lines with time labels */}
      {[1, 2, 3].map((q) => {
        const minuteLabel = q * 15;
        const labelTime = `${hour.toString().padStart(2, '0')}:${minuteLabel.toString().padStart(2, '0')}`;
        return (
          <React.Fragment key={q}>
            <div
              className={cn(
                'absolute left-0 right-0 border-t border-dashed pointer-events-none transition-opacity duration-200',
                q === 2
                  ? (isDragging ? 'border-border/50 opacity-100' : 'border-border/40 opacity-60')
                  : (isDragging ? 'border-border/40 opacity-100' : 'border-border/20 opacity-60')
              )}
              style={{ top: quarterHeight * q }}
            />
            {/* Time label at each 15-min mark - only visible while dragging */}
            {isDragging && !isOutsideBusinessHours && (
              <div
                className="absolute left-0 pointer-events-none z-10 transition-opacity duration-200"
                style={{ top: quarterHeight * q, transform: 'translateY(-50%)' }}
              >
                <span className="text-[8px] text-muted-foreground/60 font-medium pl-0.5 select-none">
                  {labelTime}
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}

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

      {/* Drop preview: ghost card + snap line at drop position */}
      {showPreviewLine && (
        <>
          {/* Snap indicator line */}
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
              {hasError ? '\u26A0 ' : '\u2713 '}
              {previewTime}
              {scheduleError && (
                <span className="ml-1 font-normal text-[10px] opacity-90">
                  - {scheduleError}
                </span>
              )}
            </div>
          </div>

          {/* Ghost preview card aligned with the snap line */}
          {!hasError && (
            <div
              className={cn(
                'absolute left-1 right-1 rounded-lg pointer-events-none z-15 overflow-hidden',
                'border border-border/40 border-l-4',
                'transition-all duration-150 ease-out',
                draggedBookingColorClasses?.bg || 'bg-primary/10',
                draggedBookingColorClasses?.border || 'border-l-primary/60',
              )}
              style={{
                top: previewLineTop,
                height: Math.min(previewCardHeight, hourHeight - previewLineTop),
                minHeight: 20,
                opacity: 0.7,
              }}
            >
              {previewCardHeight > 24 && (
                <div className="px-2 py-1 truncate">
                  {previewTime && (
                    <p className="text-[10px] font-bold text-foreground/70">
                      {previewTime}
                    </p>
                  )}
                  {draggedBookingClientName && (
                    <p className="text-[10px] font-medium text-foreground/60 truncate">
                      {draggedBookingClientName}
                    </p>
                  )}
                  {draggedBookingServiceName && previewCardHeight > 48 && (
                    <p className="text-[9px] text-muted-foreground truncate">
                      {draggedBookingServiceName}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {children}
    </div>
  );
}

export default DroppableTimeSlotEnhanced;
