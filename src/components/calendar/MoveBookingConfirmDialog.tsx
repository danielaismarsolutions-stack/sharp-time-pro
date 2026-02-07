// Confirmation dialog for drag-and-drop booking moves
// Shows old vs new booking details and allows confirm/cancel
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRight,
  Calendar,
  Clock,
  User,
  Scissors,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiBooking } from '@/types/api';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export interface MoveBookingDetails {
  booking: ApiBooking;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

interface MoveBookingConfirmDialogProps {
  open: boolean;
  details: MoveBookingDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

function isSameDate(a: string, b: string): boolean {
  return a === b;
}

export function MoveBookingConfirmDialog({
  open,
  details,
  onConfirm,
  onCancel,
  isLoading = false,
}: MoveBookingConfirmDialogProps) {
  if (!details) return null;

  const { booking, oldDate, oldStartTime, oldEndTime, newDate, newStartTime, newEndTime } = details;
  const dateChanged = !isSameDate(oldDate, newDate);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent className="max-w-[360px] sm:max-w-md rounded-xl p-0 overflow-hidden">
        {/* Header */}
        <AlertDialogHeader className="px-5 pt-5 pb-0">
          <AlertDialogTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Mover cita
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Confirma el cambio de horario para esta cita
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Booking info */}
        <div className="px-5 py-3 space-y-3">
          {/* Client & Service summary */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{booking.client_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {booking.service_name}
                {booking.barber && ` - ${booking.barber}`}
              </p>
            </div>
          </div>

          {/* Old -> New comparison */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
            {/* Old time */}
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5">
                Antes
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-bold">
                    {formatTime(oldStartTime)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    - {formatTime(oldEndTime)}
                  </span>
                </div>
                {dateChanged && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground capitalize">
                      {formatDate(oldDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* New time */}
            <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
              <p className="text-[10px] uppercase font-semibold text-primary tracking-wider mb-1.5">
                Nuevo
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-sm font-bold text-primary">
                    {formatTime(newStartTime)}
                  </span>
                  <span className="text-xs text-primary/70">
                    - {formatTime(newEndTime)}
                  </span>
                </div>
                {dateChanged && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs text-primary capitalize">
                      {formatDate(newDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <AlertDialogFooter className="px-5 pb-5 pt-2 flex flex-row gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-11 text-sm font-medium"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-11 text-sm font-medium bg-primary hover:bg-primary/90"
          >
            {isLoading ? 'Moviendo...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MoveBookingConfirmDialog;
