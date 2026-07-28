import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCorrectTimeEntry } from '@/hooks/useQueryHooks';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import type { TimeEntry } from '@/types/timeEntry';

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TimeEntryCorrectionDialogProps {
  entry: TimeEntry;
  onClose: () => void;
}

export default function TimeEntryCorrectionDialog({ entry, onClose }: TimeEntryCorrectionDialogProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const correctEntry = useCorrectTimeEntry();

  const [clockIn, setClockIn] = useState(toLocalDatetimeValue(entry.clock_in));
  const [clockOut, setClockOut] = useState(toLocalDatetimeValue(entry.clock_out));
  const [notes, setNotes] = useState(entry.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    correctEntry.mutate(
      {
        entryId: entry.id,
        correctedById: user.id,
        data: {
          clock_in: clockIn ? new Date(clockIn).toISOString() : undefined,
          clock_out: clockOut ? new Date(clockOut).toISOString() : undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t('timeTracking.correction.saved') });
          onClose();
        },
        onError: (err) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('timeTracking.correction.title')}</DialogTitle>
          <DialogDescription>
            {t('timeTracking.correction.employee', {
              name: entry.user_name ?? t('timeTracking.correction.unknownEmployee'),
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="correction-clock-in">{t('timeTracking.correction.clockInLabel')}</Label>
            <Input
              id="correction-clock-in"
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correction-clock-out">{t('timeTracking.correction.clockOutLabel')}</Label>
            <Input
              id="correction-clock-out"
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correction-notes">{t('timeTracking.correction.noteLabel')}</Label>
            <Textarea
              id="correction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('timeTracking.correction.notePlaceholder')}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={correctEntry.isPending}>
              {correctEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('timeTracking.correction.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
