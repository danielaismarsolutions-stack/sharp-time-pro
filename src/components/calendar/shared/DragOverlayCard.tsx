// Drag overlay card displayed while dragging a booking - follows the pointer with preview info
import React from 'react';
import { Clock, User, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';

interface DragOverlayCardProps {
  booking: ApiBooking;
  previewTime?: string | null;
  hasConflict?: boolean;
  conflictingNames?: string[];
  scheduleError?: string;
}

export function DragOverlayCard({
  booking,
  previewTime,
  hasConflict = false,
  conflictingNames = [],
  scheduleError,
}: DragOverlayCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const hasError = hasConflict || !!scheduleError;

  return (
    <div
      className={cn(
        'bg-card/90 backdrop-blur-sm rounded-xl shadow-2xl p-3 border-l-4 min-w-[180px] max-w-[250px]',
        'scale-105 rotate-1',
        hasError
          ? 'border-destructive ring-2 ring-destructive/30'
          : 'border-primary ring-2 ring-primary/30'
      )}
      style={{
        opacity: 0.85,
        filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.15)) drop-shadow(0 8px 10px rgba(0,0,0,0.1))',
      }}
    >
      {/* Preview time badge - floating above the card */}
      {previewTime && (
        <div
          className={cn(
            'absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg',
            'flex items-center gap-1.5',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            hasError
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {hasError ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          <ArrowRight className="w-3 h-3 opacity-70" />
          {previewTime}
        </div>
      )}

      {/* Original time */}
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span
          className={cn(
            'font-bold text-sm',
            previewTime && previewTime !== startTime && 'line-through text-muted-foreground'
          )}
        >
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

      {/* Schedule error */}
      {scheduleError && (
        <div className="mt-2 pt-2 border-t border-destructive/30">
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {scheduleError}
          </p>
        </div>
      )}

      {/* Conflict warning */}
      {!scheduleError && hasConflict && conflictingNames.length > 0 && (
        <div className="mt-2 pt-2 border-t border-destructive/30">
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Conflicto con: {conflictingNames.slice(0, 2).join(', ')}
            {conflictingNames.length > 2 && ` +${conflictingNames.length - 2}`}
          </p>
        </div>
      )}

      {/* Valid drop indicator */}
      {previewTime && !hasError && (
        <div className="mt-2 pt-2 border-t border-emerald-500/30">
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            Horario disponible
          </p>
        </div>
      )}
    </div>
  );
}

export default DragOverlayCard;
