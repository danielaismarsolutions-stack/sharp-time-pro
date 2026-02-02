// Drag overlay card with time preview during drag
import React from 'react';
import { Clock, User, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';

interface DragOverlayCardProps {
  booking: ApiBooking;
  previewTime?: string | null;
  hasConflict?: boolean;
  conflictingNames?: string[];
}

export function DragOverlayCard({
  booking,
  previewTime,
  hasConflict = false,
  conflictingNames = [],
}: DragOverlayCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  
  return (
    <div 
      className={cn(
        'bg-card rounded-lg shadow-2xl p-3 border-l-4 min-w-[180px] max-w-[250px]',
        'transform scale-105 transition-transform',
        hasConflict 
          ? 'border-destructive ring-2 ring-destructive/30' 
          : 'border-primary ring-2 ring-primary/30'
      )}
    >
      {/* Preview time badge */}
      {previewTime && (
        <div 
          className={cn(
            'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg',
            hasConflict 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-primary text-primary-foreground animate-pulse'
          )}
        >
          {hasConflict && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {previewTime}
        </div>
      )}
      
      {/* Original time */}
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className={cn(
          'font-bold text-sm',
          previewTime && previewTime !== startTime && 'line-through text-muted-foreground'
        )}>
          {startTime} - {endTime}
        </span>
      </div>
      
      {/* Client name */}
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold">{booking.client_name}</span>
      </div>
      
      {/* Service */}
      <p className="text-sm text-muted-foreground pl-6">{booking.service_name}</p>
      
      {/* Conflict warning */}
      {hasConflict && conflictingNames.length > 0 && (
        <div className="mt-2 pt-2 border-t border-destructive/30">
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Conflicto con: {conflictingNames.slice(0, 2).join(', ')}
            {conflictingNames.length > 2 && ` +${conflictingNames.length - 2}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default DragOverlayCard;
