// Modal for viewing event details with edit/delete actions
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarDays,
  Clock,
  MapPin,
  Repeat,
  Edit,
  Trash2,
  User,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ApiCalendarEvent } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EventDetailModalProps {
  event: ApiCalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onEdit: (event: ApiCalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

const repeatLabels: Record<string, string> = {
  none: 'Solo una vez',
  daily: 'Todos los días',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
};

export function EventDetailModal({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  if (!event) return null;

  const startTime = event.start_time.substring(0, 5);
  const endTime = event.end_time.substring(0, 5);
  const dateFormatted = format(
    new Date(event.event_date + 'T00:00:00'),
    "EEEE d 'de' MMMM yyyy",
    { locale: es }
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: event.color || '#d1d5db' }}
            />
            <span className="truncate">{event.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Date & time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {startTime} - {endTime}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="capitalize">{dateFormatted}</span>
          </div>

          {/* Repeat */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Repeat className="h-3.5 w-3.5 shrink-0" />
            <span>{repeatLabels[event.repeat] || 'Solo una vez'}</span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Barber */}
          {event.barber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{event.barber}</span>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <>
              <Separator />
              <div className="flex gap-2 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="text-xs whitespace-pre-wrap">
                  {event.notes}
                </span>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
            >
              <Edit className="h-3 w-3 mr-1.5" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
