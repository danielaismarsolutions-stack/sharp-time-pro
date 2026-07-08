// Enhanced droppable time slot with 15-minute visual guides, schedule feedback, and drop zone states
// Drag snapping happens in 5-minute steps (see useCalendarDragDropEnhanced);
// the dashed guides stay at 15-minute marks to keep the grid readable.
// Drops outside opening hours are ALLOWED — they render as an amber warning,
// while overlapping another booking renders as a red (blocking) error.
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { AlertTriangle, Ban, Check, Moon } from 'lucide-react';

interface DroppableTimeSlotEnhancedProps {
  id: string;
  hour: number;
  date: string;
  hourHeight: number;
  children?: React.ReactNode;
  className?: string;
  isDropTarget?: boolean;
  previewTime?: string | null;
  /** Blocking: the dragged booking overlaps another booking */
  hasConflict?: boolean;
  /** Non-blocking: outside business/barber hours, vacation or closure day */
  scheduleWarning?: string;
  isOutsideBusinessHours?: boolean;
  /** Always-visible: this slot falls outside open hours (business or barber) */
  isClosed?: boolean;
  isDragging?: boolean;
  /** Duration of the dragged booking in minutes, for preview card sizing */
  draggedBookingDuration?: number;
  /** Client name of the dragged booking, for preview card */
  draggedBookingClientName?: string;
  /** Service name of the dragged booking */
  draggedBookingServiceName?: string;
  /** Color classes for the dragged booking's barber */
  draggedBookingColorClasses?: { bg: string; border: string; text: string };
  /** Closed minute ranges within a partially-open hour (e.g., [{startMinute:0, endMinute:15}]) */
  closedMinuteRanges?: { startMinute: number; endMinute: number }[];
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
  scheduleWarning,
  isOutsideBusinessHours = false,
  isClosed = false,
  isDragging = false,
  draggedBookingDuration,
  draggedBookingClientName,
  draggedBookingServiceName,
  draggedBookingColorClasses,
  closedMinuteRanges,
}: DroppableTimeSlotEnhancedProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      hour,
      date,
    },
  });

  const quarterHeight = hourHeight / 4;
  const hasWarning = !hasConflict && (!!scheduleWarning || isOutsideBusinessHours);

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
        'border-b border-border relative',
        // Only transition when NOT closed (closed slots must stay fixed)
        !isClosed && 'transition-colors duration-200',
        // Always-visible closed/unavailable hours — no hover/active overrides
        isClosed && !isDragging && 'bg-neutral-200/70',
        // When user is dragging - closed zones stay droppable but dimmed
        isDragging && isOutsideBusinessHours && 'bg-muted/40',
        // Active hover states during drag
        isOver && hasConflict && 'bg-destructive/10',
        isOver && !hasConflict && hasWarning && 'bg-amber-500/10',
        isOver && !hasConflict && !hasWarning && 'bg-emerald-500/10',
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

      {/* Outside opening hours overlay — still droppable, drop shows a warning */}
      {isDragging && isOutsideBusinessHours && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
            <Moon className="w-3 h-3" />
            <span className="text-[9px] font-medium">Fuera de horario</span>
          </div>
        </div>
      )}

      {/* Valid drop zone indicator when hovering */}
      {isOver && !hasConflict && !hasWarning && (
        <div className="absolute top-1 right-1 pointer-events-none z-20">
          <div className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Warning drop zone indicator (allowed, outside schedule) */}
      {isOver && !hasConflict && hasWarning && (
        <div className="absolute top-1 right-1 pointer-events-none z-20">
          <div className="w-4 h-4 rounded-full bg-amber-500/90 flex items-center justify-center">
            <AlertTriangle className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Blocked drop zone indicator (conflict with another booking) */}
      {isOver && hasConflict && (
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
              hasConflict
                ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : hasWarning
                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            )}
            style={{ top: previewLineTop }}
          >
            {/* Time label badge */}
            <div
              className={cn(
                'absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-bold shadow-md whitespace-nowrap',
                'transition-colors duration-150',
                hasConflict
                  ? 'bg-destructive text-destructive-foreground'
                  : hasWarning
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
              )}
            >
              {hasConflict || hasWarning ? '⚠ ' : '✓ '}
              {previewTime}
              {scheduleWarning && !hasConflict && (
                <span className="ml-1 font-normal text-[10px] opacity-90">
                  - {scheduleWarning}
                </span>
              )}
            </div>
          </div>

          {/* Ghost preview card aligned with the snap line (hidden on blocking conflicts) */}
          {!hasConflict && (
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
                height: previewCardHeight,
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

      {/* Partial-hour closed overlays for sub-hour business/barber schedule boundaries */}
      {!isClosed && closedMinuteRanges && closedMinuteRanges.length > 0 && closedMinuteRanges.map((range, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 bg-neutral-200/70 pointer-events-none"
          style={{
            top: (range.startMinute / 60) * hourHeight,
            height: ((range.endMinute - range.startMinute) / 60) * hourHeight,
          }}
        />
      ))}

      {children}
    </div>
  );
}

export default DroppableTimeSlotEnhanced;
