// Dialog that lets the user choose between creating a Booking or an Event
import { CalendarPlus, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface CreateChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseBooking: () => void;
  onChooseEvent: () => void;
}

export function CreateChoiceDialog({
  open,
  onOpenChange,
  onChooseBooking,
  onChooseEvent,
}: CreateChoiceDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-base">
            {t('calendar.createChoice.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Booking option */}
          <button
            onClick={() => {
              onOpenChange(false);
              onChooseBooking();
            }}
            className={cn(
              'flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border',
              'hover:border-primary/50 hover:bg-primary/5',
              'transition-all duration-150 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary/30'
            )}
          >
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{t('calendar.createChoice.booking')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {t('calendar.createChoice.bookingDescription')}
              </p>
            </div>
          </button>

          {/* Event option */}
          <button
            onClick={() => {
              onOpenChange(false);
              onChooseEvent();
            }}
            className={cn(
              'flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border',
              'hover:border-violet-400/50 hover:bg-violet-50/50',
              'transition-all duration-150 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-violet-300/30'
            )}
          >
            <div className="h-11 w-11 rounded-full bg-violet-100 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-violet-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{t('calendar.createChoice.event')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {t('calendar.createChoice.eventDescription')}
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
