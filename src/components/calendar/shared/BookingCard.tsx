// BookingCard component matching Setmore's visual style
import React, { forwardRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

// Status-based color mapping (Setmore style)
const getStatusColors = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        bg: '#D1FAE5', // Mint/teal
        border: '#10B981', // Green accent
        text: '#065F46', // Dark green text
      };
    case 'pending':
      return {
        bg: '#FEF3C7', // Light yellow
        border: '#F59E0B', // Amber accent
        text: '#92400E', // Dark amber text
      };
    case 'completed':
      return {
        bg: '#F3F4F6', // Light gray
        border: '#9CA3AF', // Gray accent
        text: '#374151', // Dark gray text
      };
    case 'no-show':
      return {
        bg: '#FEE2E2', // Light red
        border: '#EF4444', // Red accent
        text: '#991B1B', // Dark red text
      };
    default:
      return {
        bg: '#D1FAE5', // Default mint
        border: '#10B981',
        text: '#065F46',
      };
  }
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
  ({ booking, style, widthPercent, leftPercent, gap, isDragging, isDraggable, dragStyle, dragAttributes, dragListeners, onClick }, ref) => {
    const statusColors = getStatusColors(booking.status);
    const isShortCard = style.height < 40;
    const isTinyCard = style.height < 30;

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          // Base styling - Setmore style
          'absolute rounded-lg cursor-pointer',
          'transition-all duration-150 overflow-hidden flex flex-col justify-start text-left',
          // Border left accent
          'border-l-[3px]',
          // Hover effects
          'hover:brightness-[0.95] hover:shadow-md',
          // Active/pressed state
          'active:scale-[0.98] active:brightness-[0.92]',
          // Dragging state
          isDragging && 'opacity-70 shadow-xl cursor-grabbing z-50',
          // Padding
          isTinyCard ? 'px-2 py-1' : 'px-3 py-2'
        )}
        style={{
          top: style.top,
          height: Math.max(style.height, 30), // Minimum 30px
          left: style.left || `calc(${leftPercent}% + ${gap}px)`,
          width: style.width || `calc(${widthPercent}% - ${gap * 2}px)`,
          backgroundColor: statusColors.bg,
          borderLeftColor: statusColors.border,
          color: statusColors.text,
          ...dragStyle,
        }}
        {...(isDraggable ? { ...dragAttributes, ...dragListeners } : {})}
      >
        {/* Line 1: Client Name - BOLD */}
        <span 
          className={cn(
            'font-bold truncate w-full',
            isTinyCard ? 'text-[11px]' : 'text-[13px]'
          )}
        >
          {widthPercent < 35 ? getInitials(booking.client_name) : booking.client_name}
        </span>
        
        {/* Line 2: Service Name - only show if card is tall enough */}
        {!isShortCard && (
          <span 
            className="text-[11px] font-normal truncate w-full mt-0.5 opacity-80"
          >
            {booking.service_name}
          </span>
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
  } : undefined;
  
  // Calculate width based on overlaps (side-by-side for all devices)
  const widthPercent = 100 / total;
  const leftPercent = index * widthPercent;
  const gap = isMobile ? 2 : 4; // Small padding from edges
  
  // Show tooltip for narrow cards or many overlaps
  const showTooltip = widthPercent < 50 || total >= 3;
  
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);

  const cardProps = {
    booking,
    style,
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
