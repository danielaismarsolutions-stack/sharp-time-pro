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
import TimeEntryCorrectionDialog from './TimeEntryCorrectionDialog';
import type { TimeEntry } from '@/types/timeEntry';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', weekday: 'short' });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Abierto', variant: 'default' },
  closed: { label: 'Cerrado', variant: 'secondary' },
  auto_closed: { label: 'Auto-cerrado', variant: 'destructive' },
  corrected: { label: 'Corregido', variant: 'outline' },
};

interface TimeEntryTableProps {
  entries: TimeEntry[];
  showEmployee?: boolean;
  isAdmin?: boolean;
}

export default function TimeEntryTable({ entries, showEmployee = false, isAdmin = false }: TimeEntryTableProps) {
  const { toast } = useToast();
  const deleteEntry = useDeleteTimeEntry();
  const { confirm, dialogProps } = useConfirmAction();
  const [correctionEntry, setCorrectionEntry] = useState<TimeEntry | null>(null);

  const handleDelete = async (entry: TimeEntry) => {
    const confirmed = await confirm({
      title: 'Eliminar fichaje',
      description: `Se eliminara el fichaje de ${entry.user_name ?? 'empleado'} del ${formatDate(entry.clock_in)}. Esta accion no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    deleteEntry.mutate(entry.id, {
      onSuccess: () => toast({ title: 'Fichaje eliminado' }),
      onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
    });
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay fichajes en este periodo.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployee && <TableHead>Empleado</TableHead>}
              <TableHead>Fecha</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Duracion</TableHead>
              <TableHead>Estado</TableHead>
              {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
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
                  <TableCell>{formatDate(entry.clock_in)}</TableCell>
                  <TableCell>{formatTime(entry.clock_in)}</TableCell>
                  <TableCell>
                    {entry.clock_out ? formatTime(entry.clock_out) : (
                      <span className="text-green-600 font-medium">En curso</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(entry.duration_minutes)}</TableCell>
                  <TableCell>
                    <Badge variant={sc.variant} className="text-xs">
                      {entry.status === 'auto_closed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {sc.label}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setCorrectionEntry(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
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
