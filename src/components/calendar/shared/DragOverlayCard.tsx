// Drag overlay card - semi-transparent copy that follows the pointer
import React from 'react';
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
  scheduleError,
}: DragOverlayCardProps) {
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const hasError = hasConflict || !!scheduleError;

  return (
    <div
      className="rounded-lg border border-border/40 border-l-4 border-l-primary/60 bg-primary/10 px-2 py-1.5 min-w-[120px] max-w-[200px] pointer-events-none transition-transform duration-150 scale-105"
      style={{
        opacity: 0.9,
        filter: hasError ? 'saturate(0.3)' : undefined,
        boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
      }}
    >
      <p className="text-[10px] font-bold text-foreground/80">
        {startTime} - {endTime}
      </p>
      <p className="text-[10px] font-medium text-foreground/70 truncate">
        {booking.client_name}
      </p>
      {booking.service_name && (
        <p className="text-[9px] text-muted-foreground truncate">
          {booking.service_name}
        </p>
      )}
    </div>
  );
}

export default DragOverlayCard;
