// Shared BookingCard component with drag-and-drop support and consistent text sizing
import React, { forwardRef } from 'react';
import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';
import { ColorClasses, OverlapInfo } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BookingCardProps {
  booking: ApiBooking;
  style: { top: number; height: number; left?: string; width?: string };
  colorClasses: ColorClasses;
  overlapInfo: OverlapInfo;
  onClick: () => void;
  isDraggable?: boolean;
  viewMode?: 'day' | 'week' | 'month';
  isMobile?: boolean;
  /** When true, card is attenuated (pending move confirmation) */
  isPendingMove?: boolean;
}

// Get spacing based on card height - text size is ALWAYS the same
const getSpacingStyles = (height: number) => {
  if (height < 35) {
    return {
      padding: 'px-1 py-0.5',
      marginBetween: 'mt-0',
      lineHeight: 'leading-tight',
    };
  }
  if (height < 50) {
    return {
      padding: 'px-1.5 py-0.5',
      marginBetween: 'mt-0.5',
      lineHeight: 'leading-tight',
    };
  }
  if (height < 70) {
    return {
      padding: 'px-1.5 py-1',
      marginBetween: 'mt-1',
      lineHeight: 'leading-normal',
    };
  }
  if (height < 100) {
    return {
      padding: 'px-2 py-1.5',
      marginBetween: 'mt-1.5',
      lineHeight: 'leading-normal',
    };
  }
  return {
    padding: 'px-2 py-2',
    marginBetween: 'mt-2',
    lineHeight: 'leading-relaxed',
  };
};

// Get client initials for very narrow cards
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Inner card button component with forwardRef for tooltip compatibility
interface CardButtonProps {
  booking: ApiBooking;
  style: { top: number; height: number; left?: string; width?: string };
  colorClasses: ColorClasses;
  spacingStyles: ReturnType<typeof getSpacingStyles>;
  widthPercent: number;
  leftPercent: number;
  gap: number;
  isDragging: boolean;
  isDraggable: boolean;
  dragStyle?: React.CSSProperties;
  dragAttributes: DraggableAttributes;
  dragListeners: Record<string, unknown> | undefined;
  onClick: () => void;
  isMobile?: boolean;
  isPendingMove?: boolean;
}

const CardButton = forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ booking, style, colorClasses, spacingStyles, widthPercent, leftPercent, gap, isDragging, isDraggable, dragStyle, dragAttributes, dragListeners, onClick, isMobile, isPendingMove }, ref) => {
    const startTime = booking.start_time.substring(0, 5);
    const endTime = booking.end_time.substring(0, 5);

    return (
      <button
        ref={ref}
        onClick={isDragging ? undefined : (e) => { e.stopPropagation(); onClick(); }}
        className={cn(
          // Base styling
          'absolute rounded-lg border border-border/40 border-l-4 cursor-pointer',
          'overflow-hidden flex flex-col justify-start text-left',
          // Shadow for depth
          'shadow-sm hover:shadow-md',
          // Hover effects (only when not dragging)
          !isDragging && 'hover:brightness-95 hover:scale-[1.01]',
          // Smooth transitions for snap-to-grid animation
          'transition-[box-shadow,filter,transform] duration-200',
          // Dragging state - ghosted appearance at original position
          isDragging && 'opacity-40 shadow-none z-0',
          // Pending move confirmation - attenuated
          isPendingMove && !isDragging && 'opacity-30',
          isDragging && isDraggable && 'touch-none',
          // Padding based on height
          spacingStyles.padding,
          spacingStyles.lineHeight,
          // Colors
          colorClasses.bg,
          colorClasses.text,
          colorClasses.border
        )}
        style={{
          top: style.top,
          height: style.height,
          left: style.left || `calc(${leftPercent}% + ${gap}px)`,
          width: style.width || `calc(${widthPercent}% - ${gap * 2}px)`,
          minHeight: 20,
          ...dragStyle,
        }}
        {...(isDraggable ? { ...dragAttributes, ...dragListeners } : {})}
      >
        {/* Drag grip indicator for draggable cards */}
        {isDraggable && !isDragging && style.height >= 40 && (
          <div className="absolute top-0.5 right-0.5 opacity-30">
            <GripVertical className="w-3 h-3" />
          </div>
        )}

        {/* Row 1: Time range */}
        <div className="flex items-center gap-1 w-full">
          <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
          <span className="text-[10px] font-bold whitespace-nowrap">
            {startTime} - {endTime}
          </span>
        </div>

        {/* Row 2: Client Name */}
        <div className={cn('flex items-center gap-1 w-full', spacingStyles.marginBetween)}>
          <User className="w-2.5 h-2.5 shrink-0 opacity-70" />
          <span className="text-[10px] font-medium truncate">
            {widthPercent < 35 ? getInitials(booking.client_name) : booking.client_name}
          </span>
        </div>
      </button>
    );
  }
);

CardButton.displayName = 'CardButton';

export function BookingCard({
  booking,
  style,
  colorClasses,
  overlapInfo,
  onClick,
  isDraggable = true,
  viewMode = 'day',
  isMobile = false,
  isPendingMove = false,
}: BookingCardProps) {
  const { total, index } = overlapInfo;

  // Drag and drop setup
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
    data: { booking },
    disabled: !isDraggable,
  });

  // Don't apply transform to the original card - it stays in place.
  // The DragOverlay component handles the moving visual.
  const dragStyle = undefined;

  // Calculate width based on overlaps
  const widthPercent = 100 / total;
  const leftPercent = index * widthPercent;
  const gap = isMobile ? 1 : 2;

  // Get spacing based on card height
  const spacingStyles = getSpacingStyles(style.height);

  // Show tooltip for narrow cards
  const showTooltip = widthPercent < 50 || total >= 3;

  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);

  const cardProps = {
    booking,
    style,
    colorClasses,
    spacingStyles,
    widthPercent,
    leftPercent,
    gap,
    isDragging,
    isDraggable,
    dragStyle,
    dragAttributes: attributes,
    dragListeners: listeners,
    onClick,
    isMobile,
    isPendingMove,
  };

  // Wrap with tooltip for compact cards
  if (showTooltip && !isDragging) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <CardButton ref={setNodeRef} {...cardProps} />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-bold">{startTime} - {endTime}</p>
              <p className="font-semibold">{booking.client_name}</p>
              <p className="text-sm opacity-80">{booking.service_name}</p>
              {booking.barber && (
                <p className="text-sm opacity-70">Barbero: {booking.barber}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <CardButton ref={setNodeRef} {...cardProps} />;
}

export default BookingCard;
