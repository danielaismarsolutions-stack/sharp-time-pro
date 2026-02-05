// Time slot selection box with draggable handles
import React from 'react';
import { cn } from '@/lib/utils';
import { TimeSlotSelection } from '@/hooks/useTimeSlotSelection';

interface TimeSlotSelectionBoxProps {
  selection: TimeSlotSelection;
  style: { top: number; height: number } | null;
  onStartDragHandle: (handle: 'top' | 'bottom', e: React.PointerEvent | React.TouchEvent) => void;
  onComplete: () => void;
}

export function TimeSlotSelectionBox({
  selection,
  style,
  onStartDragHandle,
  onComplete,
}: TimeSlotSelectionBoxProps) {
  if (!style || !selection.isActive) return null;

  const handleSize = 12; // diameter of handle circles

  return (
    <div
      className={cn(
        'absolute left-1 right-1 z-30 pointer-events-auto',
        'transition-[height] duration-75 ease-out'
      )}
      style={{
        top: style.top,
        height: style.height,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onComplete();
      }}
    >
      {/* Selection box container */}
      <div
        className={cn(
          'absolute inset-0',
          'border-2 border-foreground rounded-md',
          'bg-foreground/5'
        )}
      >
        {/* Top time label */}
        <div
          className={cn(
            'absolute -top-6 left-1/2 -translate-x-1/2',
            'bg-foreground text-background',
            'text-xs font-semibold px-2 py-0.5 rounded',
            'whitespace-nowrap shadow-md'
          )}
        >
          {selection.startTime}
        </div>

        {/* Bottom time label */}
        <div
          className={cn(
            'absolute -bottom-6 left-1/2 -translate-x-1/2',
            'bg-foreground text-background',
            'text-xs font-semibold px-2 py-0.5 rounded',
            'whitespace-nowrap shadow-md'
          )}
        >
          {selection.endTime}
        </div>

        {/* Top handle */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2',
            'cursor-ns-resize touch-none select-none',
            'transition-transform duration-100',
            selection.isDraggingHandle === 'top' && 'scale-125'
          )}
          style={{
            top: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onPointerDown={(e) => onStartDragHandle('top', e)}
          onTouchStart={(e) => onStartDragHandle('top', e)}
        >
          <div
            className={cn(
              'w-full h-full rounded-full',
              'bg-background border-2 border-foreground',
              'shadow-md',
              'hover:scale-110 transition-transform'
            )}
          />
        </div>

        {/* Bottom handle */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2',
            'cursor-ns-resize touch-none select-none',
            'transition-transform duration-100',
            selection.isDraggingHandle === 'bottom' && 'scale-125'
          )}
          style={{
            bottom: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onPointerDown={(e) => onStartDragHandle('bottom', e)}
          onTouchStart={(e) => onStartDragHandle('bottom', e)}
        >
          <div
            className={cn(
              'w-full h-full rounded-full',
              'bg-background border-2 border-foreground',
              'shadow-md',
              'hover:scale-110 transition-transform'
            )}
          />
        </div>

        {/* Duration indicator in center */}
        {style.height >= 60 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-medium text-foreground/60">
              {calculateDuration(selection.startTime, selection.endTime)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to calculate duration string
function calculateDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

export default TimeSlotSelectionBox;
