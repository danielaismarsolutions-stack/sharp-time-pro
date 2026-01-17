import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusDot, BookingStatus } from './StatusBadge';
import { ApiBooking } from '@/types/api';
import { GripVertical, Clock, User, Scissors } from 'lucide-react';

export interface DraggableBookingCardProps {
  booking: ApiBooking;
  variant?: 'compact' | 'medium' | 'large';
  isDragging?: boolean;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const statusGradients: Record<BookingStatus, { bg: string; border: string; glow: string }> = {
  pending: {
    bg: 'from-amber-500/25 to-amber-600/15',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
  },
  confirmed: {
    bg: 'from-blue-500/25 to-blue-600/15',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/20',
  },
  completed: {
    bg: 'from-emerald-500/25 to-emerald-600/15',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
  },
  cancelled: {
    bg: 'from-rose-500/25 to-rose-600/15',
    border: 'border-rose-500/40',
    glow: 'shadow-rose-500/20',
  },
  no_show: {
    bg: 'from-purple-500/25 to-purple-600/15',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/20',
  },
};

export function DraggableBookingCard({
  booking,
  variant = 'medium',
  isDragging = false,
  onClick,
  style,
  className,
}: DraggableBookingCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const statusStyle = statusGradients[booking.status as BookingStatus] || statusGradients.pending;

  const truncatedName = useMemo(() => {
    if (variant === 'compact' && booking.client_name.length > 10) {
      return booking.client_name.substring(0, 8) + '...';
    }
    if (variant === 'medium' && booking.client_name.length > 15) {
      return booking.client_name.substring(0, 13) + '...';
    }
    return booking.client_name;
  }, [booking.client_name, variant]);

  const truncatedService = useMemo(() => {
    if (variant === 'compact' && booking.service_name.length > 12) {
      return booking.service_name.substring(0, 10) + '...';
    }
    return booking.service_name;
  }, [booking.service_name, variant]);

  if (variant === 'compact') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full text-left rounded-md overflow-hidden transition-all duration-200',
          'bg-gradient-to-r border backdrop-blur-sm',
          'hover:shadow-lg cursor-pointer group',
          statusStyle.bg,
          statusStyle.border,
          isDragging && `shadow-xl ${statusStyle.glow} scale-105 z-50`,
          className
        )}
        style={style}
      >
        <div className="flex items-center gap-1.5 px-2 py-1">
          <div className="opacity-0 group-hover:opacity-60 transition-opacity">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
          <StatusDot status={booking.status as BookingStatus} size="sm" />
          <span className="text-[10px] font-semibold tabular-nums">{startTime}</span>
          <span className="text-[10px] font-medium truncate flex-1">{truncatedName}</span>
        </div>
      </motion.button>
    );
  }

  if (variant === 'medium') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'absolute left-1 right-1 rounded-lg overflow-hidden transition-all duration-200',
          'bg-gradient-to-br border backdrop-blur-sm',
          'hover:shadow-xl cursor-pointer group',
          statusStyle.bg,
          statusStyle.border,
          isDragging && `shadow-2xl ${statusStyle.glow} scale-[1.02] z-50`,
          className
        )}
        style={style}
      >
        <div className="h-full p-2 flex flex-col">
          {/* Drag handle */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-1.5 mb-1">
            <StatusDot status={booking.status as BookingStatus} size="sm" />
            <span className="text-xs font-bold tabular-nums">{startTime}</span>
            <span className="text-[10px] text-muted-foreground">- {endTime}</span>
          </div>

          {/* Client name */}
          <div className="flex items-center gap-1 mb-0.5">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold truncate">{truncatedName}</span>
          </div>

          {/* Service */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Scissors className="h-3 w-3 shrink-0" />
            <span className="text-[10px] truncate">{truncatedService}</span>
          </div>

          {/* Price badge */}
          <div className="mt-auto pt-1">
            <span className="text-[10px] font-semibold text-primary">€{booking.service_price}</span>
          </div>
        </div>
      </motion.button>
    );
  }

  // Large variant
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'absolute left-2 right-4 rounded-xl overflow-hidden transition-all duration-200',
        'bg-gradient-to-br border-l-4 border backdrop-blur-sm',
        'hover:shadow-2xl cursor-pointer group',
        statusStyle.bg,
        statusStyle.border,
        isDragging && `shadow-2xl ${statusStyle.glow} scale-[1.01] z-50`,
        className
      )}
      style={style}
    >
      <div className="h-full p-3 flex flex-col">
        {/* Drag handle */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusDot status={booking.status as BookingStatus} size="md" />
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-bold tabular-nums">{startTime}</span>
              <span className="text-xs text-muted-foreground">- {endTime}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-primary">€{booking.service_price}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold">{booking.client_name}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Scissors className="h-4 w-4 shrink-0" />
            <span className="text-sm">{booking.service_name}</span>
            <span className="text-xs">({booking.service_duration} min)</span>
          </div>
        </div>

        {/* Footer */}
        {booking.barber && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">Barbero: {booking.barber}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
