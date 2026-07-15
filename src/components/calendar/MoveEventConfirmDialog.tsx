// Confirmation dialog for drag-and-drop event moves
// Shows old vs new event details and allows confirm/cancel
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { ApiCalendarEvent } from '@/types/api';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { useTranslation } from '@/contexts/LanguageContext';
import { getBarberHexColor, DEFAULT_EVENT_HEX } from '@/components/calendar/shared/colorUtils';
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

export interface MoveEventDetails {
  event: ApiCalendarEvent;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  /** Non-blocking schedule warnings (outside business hours, closure days) */
  warnings?: string[];
}

interface MoveEventConfirmDialogProps {
  open: boolean;
  details: MoveEventDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatDate(dateStr: string, pattern: string, locale: Locale): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, pattern, { locale });
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

export function MoveEventConfirmDialog({
  open,
  details,
  onConfirm,
  onCancel,
  isLoading = false,
}: MoveEventConfirmDialogProps) {
  const staffTerms = useStaffTerms();
  const { t, dateLocale } = useTranslation();
  if (!details) return null;

  const { event, oldDate, oldStartTime, oldEndTime, newDate, newStartTime, newEndTime, warnings = [] } = details;
  const dateChanged = !isSameDate(oldDate, newDate);
  const hasWarnings = warnings.length > 0;
  const datePattern = t('calendar.dateFormats.weekdayDayMonthCompact');
  const eventHex = event.color
    || (event.barber ? getBarberHexColor(event.barber) : DEFAULT_EVENT_HEX);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent className="max-w-[360px] sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <AlertDialogHeader className="px-5 pt-5 pb-0">
          <AlertDialogTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {t('calendar.moveDialog.eventTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {t('calendar.moveDialog.eventDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Event info */}
        <div className="px-5 py-3 space-y-3">
          {/* Event summary */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: eventHex + '33' }}
            >
              <CalendarDays className="w-4 h-4" style={{ color: eventHex }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{event.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {event.barber ? `${staffTerms.singularCap}: ${event.barber}` : t('calendar.moveDialog.eventFallbackLabel')}
                {event.location && ` - ${event.location}`}
              </p>
            </div>
          </div>

          {/* Old -> New comparison */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
            {/* Old time */}
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5">
                {t('calendar.moveDialog.before')}
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
                      {formatDate(oldDate, datePattern, dateLocale)}
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
                {t('calendar.moveDialog.after')}
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
                      {formatDate(newDate, datePattern, dateLocale)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Out-of-schedule warnings */}
          {hasWarnings && (
            <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-500">
                    {t('calendar.moveDialog.outsideSchedule')}
                  </p>
                  <ul className="space-y-0.5">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700/90 dark:text-amber-500/90">
                        {w}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-700/70 dark:text-amber-500/70">
                    {t('calendar.moveDialog.eventOverrideHint')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <AlertDialogFooter className="px-5 pb-5 pt-2 flex flex-row gap-3 sm:space-x-0">
          <AlertDialogCancel
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-11 text-sm font-medium mt-0"
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

export default MoveEventConfirmDialog;
