import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeOff } from '@/types/barber';
import { Plus, Trash2, CalendarOff, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TimeOffManagerProps {
  timeOff: TimeOff[];
  onSave: (timeOff: TimeOff[]) => Promise<void>;
}

export default function TimeOffManager({ timeOff, onSave }: TimeOffManagerProps) {
  const [items, setItems] = useState<TimeOff[]>(timeOff);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!startDate || !endDate) return;

    const newItem: TimeOff = {
      id: crypto.randomUUID(),
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || undefined,
    };

    const newItems = [...items, newItem].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    setSaving(true);
    try {
      await onSave(newItems);
      setItems(newItems);
      setDialogOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setSaving(true);
    try {
      await onSave(newItems);
      setItems(newItems);
    } finally {
      setSaving(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startFormatted = format(parseISO(start), "d 'de' MMM", { locale: es });
    const endFormatted = format(parseISO(end), "d 'de' MMM, yyyy", { locale: es });
    return `${startFormatted} - ${endFormatted}`;
  };

  const upcomingTimeOff = items.filter(
    (item) => new Date(item.end_date) >= new Date()
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Días Libres
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Días Libres</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha fin</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vacaciones, cita médica, etc."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={saving || !startDate || !endDate}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Añadir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {upcomingTimeOff.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay días libres programados
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingTimeOff.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium text-sm">
                    {formatDateRange(item.start_date, item.end_date)}
                  </p>
                  {item.reason && (
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.id)}
                  className="text-destructive hover:text-destructive"
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
