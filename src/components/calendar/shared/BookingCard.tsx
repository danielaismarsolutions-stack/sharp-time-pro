// Shared BookingCard component with adaptive sizing based on card dimensions
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

// Adaptive styles based on card height - ALWAYS show client name
const getAdaptiveStyles = (height: number, total: number, viewMode: string) => {
  // Very small cards (< 30px) - ultra compact but still show client
  if (height < 30 || total >= 6) {
    return {
      textSize: 'text-[7px]',
      iconSize: 'w-1.5 h-1.5',
      padding: 'px-0.5 py-0.5',
      gap: 'gap-0.5',
      showClient: true,
      showTimeRange: false,
      lineHeight: 'leading-none',
      marginTop: 'mt-0',
    };
  }
  
  // Small cards (30-45px) - compact display
  if (height < 45 || total >= 5) {
    return {
      textSize: 'text-[8px]',
      iconSize: 'w-2 h-2',
      padding: 'px-1 py-0.5',
      gap: 'gap-0.5',
      showClient: true,
      showTimeRange: false,
      lineHeight: 'leading-tight',
      marginTop: 'mt-0',
    };
  }
  
  // Medium-small cards (45-60px) - standard compact
  if (height < 60 || total >= 4) {
    return {
      textSize: 'text-[9px]',
      iconSize: 'w-2 h-2',
      padding: 'px-1 py-0.5',
      gap: 'gap-0.5',
      showClient: true,
      showTimeRange: true,
      lineHeight: 'leading-tight',
      marginTop: 'mt-0.5',
    };
  }
  
  // Medium cards (60-80px) - comfortable compact
  if (height < 80 || total >= 3 || viewMode === 'week') {
    return {
      textSize: 'text-[10px]',
      iconSize: 'w-2.5 h-2.5',
      padding: 'px-1.5 py-1',
      gap: 'gap-1',
      showClient: true,
      showTimeRange: true,
      lineHeight: 'leading-normal',
      marginTop: 'mt-0.5',
    };
  }
  
  // Large cards (80-100px) - comfortable display
  if (height < 100) {
    return {
      textSize: 'text-xs',
      iconSize: 'w-3 h-3',
      padding: 'px-2 py-1.5',
      gap: 'gap-1',
      showClient: true,
      showTimeRange: true,
      lineHeight: 'leading-normal',
      marginTop: 'mt-0.5',
    };
  }
  
  // Extra large cards (>= 100px) - full display
  return {
    textSize: 'text-sm',
    iconSize: 'w-3.5 h-3.5',
    padding: 'px-2.5 py-2',
    gap: 'gap-1.5',
    showClient: true,
    showTimeRange: true,
    lineHeight: 'leading-relaxed',
    marginTop: 'mt-1',
  };
};

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
  adaptiveStyles: ReturnType<typeof getAdaptiveStyles>;
  widthPercent: number;
  leftPercent: number;
  gap: number;
  isDragging: boolean;
  isDraggable: boolean;
  dragStyle?: React.CSSProperties;
  dragAttributes: Record<string, any>;
  dragListeners: Record<string, any> | undefined;
  onClick: () => void;
}

const CardButton = forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ booking, style, colorClasses, adaptiveStyles, widthPercent, leftPercent, gap, isDragging, isDraggable, dragStyle, dragAttributes, dragListeners, onClick }, ref) => {
    const startTime = booking.start_time.substring(0, 5);
    const endTime = booking.end_time.substring(0, 5);
    const timeDisplay = adaptiveStyles.showTimeRange ? `${startTime} - ${endTime}` : startTime;

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
          // Adaptive padding
          adaptiveStyles.padding,
          // Line height
          adaptiveStyles.lineHeight,
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
        {/* Row 1: Time (bold) */}
        <div className={cn('flex items-center w-full', adaptiveStyles.gap)}>
          <Clock className={cn(adaptiveStyles.iconSize, 'shrink-0 opacity-70')} />
          <span className={cn('font-bold whitespace-nowrap', adaptiveStyles.textSize)}>
            {timeDisplay}
          </span>
        </div>
        
        {/* Row 2: Client Name - ALWAYS visible */}
        {adaptiveStyles.showClient && (
          <div className={cn('flex items-center w-full', adaptiveStyles.marginTop, adaptiveStyles.gap)}>
            <User className={cn(adaptiveStyles.iconSize, 'shrink-0 opacity-70')} />
            <span className={cn('font-medium truncate', adaptiveStyles.textSize)}>
              {widthPercent < 40 ? getInitials(booking.client_name) : booking.client_name}
            </span>
          </div>
        )}
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
  
  // Get adaptive styles based on card height and context
  const adaptiveStyles = getAdaptiveStyles(style.height, total, viewMode);
  
  // Show tooltip for narrow cards or when content is hidden
  const showTooltip = widthPercent < 50 || total >= 3 || !adaptiveStyles.showClient;
  
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);

  const cardProps = {
    booking,
    style,
    colorClasses,
    adaptiveStyles,
    widthPercent,
    leftPercent,
    gap,
    isDragging,
    isDraggable,
    dragStyle,
    dragAttributes: attributes,
    dragListeners: listeners,
    onClick,
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
