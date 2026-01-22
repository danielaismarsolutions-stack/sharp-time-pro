import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarberSchedule, BarberDaySchedule, BarberShift, DAY_NAMES } from '@/types/barber';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleEditorProps {
  schedule: BarberSchedule;
  onSave: (schedule: BarberSchedule) => Promise<void>;
}

export default function ScheduleEditor({ schedule, onSave }: ScheduleEditorProps) {
  const [editedSchedule, setEditedSchedule] = useState<BarberSchedule>(schedule);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const days = Object.keys(DAY_NAMES) as (keyof BarberSchedule)[];

  const updateDay = (day: keyof BarberSchedule, updates: Partial<BarberDaySchedule>) => {
    setEditedSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
    setHasChanges(true);
  };

  const addShift = (day: keyof BarberSchedule) => {
    const currentShifts = editedSchedule[day].shifts;
    const lastShift = currentShifts[currentShifts.length - 1];
    const newStart = lastShift ? lastShift.end : '09:00';
    const newEnd = '20:00';

    updateDay(day, {
      shifts: [...currentShifts, { start: newStart, end: newEnd }],
    });
  };

  const removeShift = (day: keyof BarberSchedule, index: number) => {
    const newShifts = editedSchedule[day].shifts.filter((_, i) => i !== index);
    updateDay(day, { shifts: newShifts });
  };

  const updateShift = (day: keyof BarberSchedule, index: number, updates: Partial<BarberShift>) => {
    const newShifts = editedSchedule[day].shifts.map((shift, i) =>
      i === index ? { ...shift, ...updates } : shift
    );
    updateDay(day, { shifts: newShifts });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedSchedule);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const validateShift = (shift: BarberShift): boolean => {
    return shift.start < shift.end;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Horario Semanal</CardTitle>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Horario
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((day) => {
          const daySchedule = editedSchedule[day];
          return (
            <div
              key={day}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                daySchedule.enabled ? 'bg-card' : 'bg-muted/50'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={daySchedule.enabled}
                    onCheckedChange={(enabled) => updateDay(day, { enabled })}
                  />
                  <Label className="font-medium">{DAY_NAMES[day]}</Label>
                </div>
                {daySchedule.enabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addShift(day)}
                    className="text-primary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir turno
                  </Button>
                )}
              </div>

              {daySchedule.enabled && (
                <div className="space-y-2 ml-10">
                  {daySchedule.shifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin turnos configurados</p>
                  ) : (
                    daySchedule.shifts.map((shift, index) => {
                      const isValid = validateShift(shift);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={shift.start}
                            onChange={(e) => updateShift(day, index, { start: e.target.value })}
                            className={cn('w-28', !isValid && 'border-destructive')}
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={shift.end}
                            onChange={(e) => updateShift(day, index, { end: e.target.value })}
                            className={cn('w-28', !isValid && 'border-destructive')}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeShift(day, index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {!isValid && (
                            <span className="text-xs text-destructive">Horario inválido</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
