// EventCard component for displaying calendar events on the time grid
// Supports drag-and-drop for moving events
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CalendarDays, MapPin, Repeat, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiCalendarEvent } from '@/types/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EventCardProps {
  event: ApiCalendarEvent;
  style: { top: number; height: number; left?: string; width?: string };
  onClick: () => void;
  isDraggable?: boolean;
  viewMode?: 'day' | 'week' | 'month';
  isMobile?: boolean;
  isPendingMove?: boolean;
}

// Map hex color to slightly transparent version for background
function hexToStyle(hex: string) {
  return {
    backgroundColor: hex + '33', // 20% opacity
    borderLeftColor: hex,
    color: '#1f2937', // gray-800
  };
}

export function EventCard({
  event,
  style,
  onClick,
  isDraggable = true,
  viewMode = 'day',
  isMobile = false,
  isPendingMove = false,
}: EventCardProps) {
  const startTime = event.start_time.substring(0, 5);
  const endTime = event.end_time.substring(0, 5);
  const colorStyle = hexToStyle(event.color || '#d1d5db');

  const isCompact = style.height < 40;
  const isNarrow = viewMode === 'week';

  // Drag and drop setup
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: { event, type: 'event' },
    disabled: !isDraggable,
  });

  const card = (
    <button
      ref={setNodeRef}
      onClick={isDragging ? undefined : (e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'absolute rounded-lg border border-border/40 border-l-4 cursor-pointer',
        'overflow-hidden flex flex-col justify-start text-left',
        'shadow-sm hover:shadow-md',
        !isDragging && 'hover:brightness-95 hover:scale-[1.01]',
        'transition-[box-shadow,filter,transform] duration-200',
        isDragging && 'opacity-40 shadow-none z-0',
        isPendingMove && !isDragging && 'opacity-30',
        isDraggable && 'touch-none',
        isCompact ? 'px-1 py-0.5' : 'px-1.5 py-1'
      )}
      style={{
        top: style.top,
        height: style.height,
        left: style.left || '4px',
        width: style.width || 'calc(100% - 8px)',
        minHeight: 20,
        backgroundColor: colorStyle.backgroundColor,
        borderLeftColor: colorStyle.borderLeftColor,
        color: colorStyle.color,
      }}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
    >
      {/* Drag grip indicator */}
      {isDraggable && !isDragging && style.height >= 40 && (
        <div className="absolute top-0.5 right-0.5 opacity-30">
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Row 1: Time + event icon */}
      <div className="flex items-center gap-1 w-full">
        <CalendarDays className="w-2.5 h-2.5 shrink-0 opacity-70" />
        <span className="text-[10px] font-bold whitespace-nowrap">
          {startTime} - {endTime}
        </span>
        {event.repeat !== 'none' && (
          <Repeat className="w-2 h-2 shrink-0 opacity-60" />
        )}
      </div>

      {/* Row 2: Event name */}
      {!isCompact && (
        <div className="flex items-center gap-1 w-full mt-0.5">
          <span className="text-[10px] font-medium truncate">
            {event.name}
          </span>
        </div>
      )}

      {/* Row 3: Location (only if enough space) */}
      {!isCompact && !isNarrow && event.location && style.height >= 55 && (
        <div className="flex items-center gap-1 w-full mt-0.5 opacity-70">
          <MapPin className="w-2 h-2 shrink-0" />
          <span className="text-[9px] truncate">{event.location}</span>
        </div>
      )}
    </button>
  );

  // Show tooltip for compact or narrow views
  if ((isCompact || isNarrow) && !isDragging) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-bold">
                {startTime} - {endTime}
              </p>
              <p className="font-semibold">{event.name}</p>
              {event.location && (
                <p className="text-sm opacity-80">{event.location}</p>
              )}
              {event.barber && (
                <p className="text-sm opacity-70">Estilista: {event.barber}</p>
              )}
              {event.repeat !== 'none' && (
                <p className="text-sm opacity-70">
                  Repite:{' '}
                  {event.repeat === 'daily'
                    ? 'diario'
                    : event.repeat === 'weekly'
                      ? 'semanal'
                      : 'mensual'}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}

export default EventCard;
