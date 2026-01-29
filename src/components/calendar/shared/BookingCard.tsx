// Shared BookingCard component with new design
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Scissors, User } from 'lucide-react';
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

// Adaptive styles based on card dimensions and overlap
const getAdaptiveStyles = (height: number, total: number, viewMode: string, isMobile: boolean) => {
  const isWeek = viewMode === 'week';
  const isCompact = total >= 3 || height < 50 || isWeek;
  const isVeryCompact = total >= 4 || height < 35 || (isWeek && total >= 2);
  const showOnlyTime = height < 25 || total >= 5;
  
  if (showOnlyTime) {
    return {
      timeSize: 'text-[8px]',
      clientSize: 'text-[8px]',
      iconSize: 'w-2 h-2',
      padding: 'px-1 py-0.5',
      showBarber: false,
      showClient: false,
      showTime: true,
      showTimeRange: false,
    };
  }
  
  if (isVeryCompact) {
    return {
      timeSize: 'text-[9px]',
      clientSize: 'text-[9px]',
      iconSize: 'w-2.5 h-2.5',
      padding: 'px-1.5 py-1',
      showBarber: false,
      showClient: height > 30,
      showTime: true,
      showTimeRange: false,
    };
  }
  
  if (isCompact) {
    return {
      timeSize: 'text-[10px]',
      clientSize: 'text-[10px]',
      iconSize: 'w-2.5 h-2.5',
      padding: 'px-1.5 py-1',
      showBarber: height > 45 && total <= 2,
      showClient: true,
      showTime: true,
      showTimeRange: height > 35,
    };
  }
  
  // Full layout
  return {
    timeSize: 'text-xs',
    clientSize: 'text-sm',
    iconSize: 'w-3 h-3',
    padding: 'px-2 py-1.5',
    showBarber: true,
    showClient: true,
    showTime: true,
    showTimeRange: true,
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
    scale: 1.02,
  } : undefined;
  
  const adaptiveStyles = getAdaptiveStyles(style.height, total, viewMode, isMobile);
  
  // Format time display
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const timeDisplay = adaptiveStyles.showTimeRange ? `${startTime}-${endTime}` : startTime;
  const barberFirstName = booking.barber?.split(' ')[0] || '';
  
  // Calculate width based on overlaps (side-by-side for desktop)
  const widthPercent = isMobile ? 100 : 100 / total;
  const leftPercent = isMobile ? 0 : index * widthPercent;
  const gap = 2; // 2px gap between overlapping cards
  
  // Show tooltip for narrow cards
  const showTooltip = widthPercent < 50 || total >= 3;
  
  const cardContent = (
    <button
      ref={setNodeRef}
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
        // Colors
        adaptiveStyles.padding,
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
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
    >
      {/* Row 1: Time (bold) + Barber */}
      <div className="flex justify-between items-center gap-1 w-full">
        <div className={cn('flex items-center gap-1 font-bold', adaptiveStyles.timeSize)}>
          <Clock className={cn(adaptiveStyles.iconSize, 'shrink-0 opacity-70')} />
          <span className="leading-none whitespace-nowrap">{timeDisplay}</span>
        </div>
        {adaptiveStyles.showBarber && barberFirstName && (
          <div className={cn('flex items-center gap-0.5 font-medium truncate', adaptiveStyles.timeSize)}>
            <Scissors className={cn(adaptiveStyles.iconSize, 'shrink-0 opacity-70')} />
            <span className="truncate leading-none">{barberFirstName}</span>
          </div>
        )}
      </div>
      
      {/* Row 2: Client Name */}
      {adaptiveStyles.showClient && (
        <div className={cn('flex items-center gap-1 mt-0.5 w-full', adaptiveStyles.clientSize)}>
          <User className={cn(adaptiveStyles.iconSize, 'shrink-0 opacity-70')} />
          <span className="font-semibold truncate leading-none">
            {widthPercent < 40 ? getInitials(booking.client_name) : booking.client_name}
          </span>
        </div>
      )}
      
      {/* Row 3: Service indicator (for larger cards) */}
      {viewMode === 'day' && style.height >= 70 && total === 1 && (
        <div className="flex items-center gap-2 mt-1 text-[10px] opacity-75 flex-wrap">
          <span className="truncate">{booking.service_name}</span>
          <span className="font-semibold">€{booking.service_price}</span>
        </div>
      )}
    </button>
  );
  
  // Wrap with tooltip for narrow cards
  if (showTooltip && !isDragging) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-bold">{startTime} - {endTime}</p>
              <p className="font-semibold">{booking.client_name}</p>
              <p className="text-sm opacity-80">{booking.service_name}</p>
              {booking.barber && (
                <p className="text-sm opacity-70">Barbero: {booking.barber}</p>
              )}
              <p className="text-sm font-semibold">€{booking.service_price}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return cardContent;
}

export default BookingCard;
