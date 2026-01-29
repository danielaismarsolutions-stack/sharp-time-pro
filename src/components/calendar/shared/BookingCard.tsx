// Shared BookingCard component with consistent design across all views
import React, { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User } from 'lucide-react';
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
}

// Get client initials for compact display
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
  widthPercent: number;
  leftPercent: number;
  gap: number;
  isDragging: boolean;
  isDraggable: boolean;
  dragStyle?: React.CSSProperties;
  dragAttributes: Record<string, any>;
  dragListeners: Record<string, any> | undefined;
  onClick: () => void;
  isCompact: boolean;
}

const CardButton = forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ booking, style, colorClasses, widthPercent, leftPercent, gap, isDragging, isDraggable, dragStyle, dragAttributes, dragListeners, onClick, isCompact }, ref) => {
    const startTime = booking.start_time.substring(0, 5);
    const endTime = booking.end_time.substring(0, 5);

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          // Base styling
          'absolute rounded-lg border border-border/40 border-l-4 cursor-pointer',
          'transition-all duration-200 overflow-hidden flex flex-col justify-start text-left',
          // Shadow for depth
          'shadow-sm hover:shadow-md',
          // Hover effects
          'hover:brightness-95 hover:scale-[1.01]',
          // Dragging state
          isDragging && 'opacity-60 scale-105 shadow-lg z-50',
          // Padding
          isCompact ? 'px-1.5 py-1' : 'px-2 py-1.5',
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
          minHeight: 24,
          ...dragStyle,
        }}
        {...(isDraggable ? { ...dragAttributes, ...dragListeners } : {})}
      >
        {/* Row 1: Time range (bold) */}
        <div className="flex items-center gap-1 w-full">
          <Clock className={cn(isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3', 'shrink-0 opacity-70')} />
          <span className={cn('font-bold leading-none whitespace-nowrap', isCompact ? 'text-[10px]' : 'text-xs')}>
            {startTime} - {endTime}
          </span>
        </div>
        
        {/* Row 2: Client Name */}
        <div className={cn('flex items-center gap-1 mt-0.5 w-full', isCompact ? 'text-[10px]' : 'text-xs')}>
          <User className={cn(isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3', 'shrink-0 opacity-70')} />
          <span className="font-medium truncate leading-none">
            {widthPercent < 40 ? getInitials(booking.client_name) : booking.client_name}
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
}: BookingCardProps) {
  const { total, index } = overlapInfo;
  
  // Drag and drop setup
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
    data: { booking },
    disabled: !isDraggable,
  });
  
  const dragStyle = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 100,
    opacity: 0.8,
  } : undefined;
  
  // Calculate width based on overlaps (side-by-side for desktop)
  const widthPercent = isMobile ? 100 : 100 / total;
  const leftPercent = isMobile ? 0 : index * widthPercent;
  const gap = 2; // 2px gap between overlapping cards
  
  // Compact mode for week view or when there are overlaps
  const isCompact = viewMode === 'week' || total >= 2;
  
  // Show tooltip for narrow cards
  const showTooltip = widthPercent < 50 || total >= 3;
  
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);

  const cardProps = {
    booking,
    style,
    colorClasses,
    widthPercent,
    leftPercent,
    gap,
    isDragging,
    isDraggable,
    dragStyle,
    dragAttributes: attributes,
    dragListeners: listeners,
    onClick,
    isCompact,
  };
  
  // Wrap with tooltip for narrow cards
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
