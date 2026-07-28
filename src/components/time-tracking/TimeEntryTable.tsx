import { useState } from 'react';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDeleteTimeEntry } from '@/hooks/useQueryHooks';
import { useToast } from '@/hooks/use-toast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import TimeEntryCorrectionDialog from './TimeEntryCorrectionDialog';
import type { TimeEntry } from '@/types/timeEntry';

function formatTime(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleDateString(intlLocale, { day: '2-digit', month: 'short', weekday: 'short' });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

const statusConfig: Record<string, { labelKey: TranslationKey; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { labelKey: 'timeTracking.status.open', variant: 'default' },
  closed: { labelKey: 'timeTracking.status.closed', variant: 'secondary' },
  auto_closed: { labelKey: 'timeTracking.status.autoClosed', variant: 'destructive' },
  corrected: { labelKey: 'timeTracking.status.corrected', variant: 'outline' },
};

interface TimeEntryTableProps {
  entries: TimeEntry[];
  showEmployee?: boolean;
  isAdmin?: boolean;
}

export default function TimeEntryTable({ entries, showEmployee = false, isAdmin = false }: TimeEntryTableProps) {
  const { t, intlLocale } = useTranslation();
  const { toast } = useToast();
  const deleteEntry = useDeleteTimeEntry();
  const { confirm, dialogProps } = useConfirmAction();
  const [correctionEntry, setCorrectionEntry] = useState<TimeEntry | null>(null);

  const handleDelete = async (entry: TimeEntry) => {
    const confirmed = await confirm({
      title: t('timeTracking.table.deleteTitle'),
      description: t('timeTracking.table.deleteDescription', {
        name: entry.user_name ?? t('timeTracking.table.employeeFallback'),
        date: formatDate(entry.clock_in, intlLocale),
      }),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
    });
    if (!confirmed) return;

    deleteEntry.mutate(entry.id, {
      onSuccess: () => toast({ title: t('timeTracking.table.deleted') }),
      onError: (err) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
    });
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('timeTracking.table.empty')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployee && <TableHead>{t('timeTracking.table.employee')}</TableHead>}
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('timeTracking.table.clockIn')}</TableHead>
              <TableHead>{t('timeTracking.table.clockOut')}</TableHead>
              <TableHead>{t('timeTracking.table.duration')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const sc = statusConfig[entry.status] ?? statusConfig.closed;
              return (
                <TableRow key={entry.id}>
                  {showEmployee && (
                    <TableCell className="font-medium">{entry.user_name ?? '-'}</TableCell>
                  )}
                  <TableCell>{formatDate(entry.clock_in, intlLocale)}</TableCell>
                  <TableCell>{formatTime(entry.clock_in, intlLocale)}</TableCell>
                  <TableCell>
                    {entry.clock_out ? formatTime(entry.clock_out, intlLocale) : (
                      <span className="text-green-600 font-medium">{t('timeTracking.table.inProgress')}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(entry.duration_minutes)}</TableCell>
                  <TableCell>
                    <Badge variant={sc.variant} className="text-xs">
                      {entry.status === 'auto_closed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {t(sc.labelKey)}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setCorrectionEntry(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() => handleDelete(entry)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ConfirmActionDialog {...dialogProps} />
      {correctionEntry && (
        <TimeEntryCorrectionDialog
          entry={correctionEntry}
          onClose={() => setCorrectionEntry(null)}
        />
      )}
    </>
  );
}
