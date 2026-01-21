import { useState } from 'react';
import { Plus, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  WeekSchedule,
  DaySchedule,
  Shift,
  DayOfWeek,
  DAY_LABELS,
  DAYS_ORDER,
} from '@/types/barber';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScheduleEditorProps {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  errors?: Record<string, string>;
}

// Generate time options in 15-minute intervals
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h.toString().padStart(2, '0');
    const minute = m.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hour}:${minute}`);
  }
}

export function ScheduleEditor({ schedule, onChange, errors }: ScheduleEditorProps) {
  const isMobile = useIsMobile();
  const [openDays, setOpenDays] = useState<DayOfWeek[]>(
    isMobile ? [] : DAYS_ORDER
  );

  const toggleDayEnabled = (day: DayOfWeek) => {
    const newSchedule = { ...schedule };
    newSchedule[day] = {
      ...newSchedule[day],
      enabled: !newSchedule[day].enabled,
    };
    onChange(newSchedule);
  };

  const addShift = (day: DayOfWeek) => {
    const newSchedule = { ...schedule };
    const newShift: Shift = { start: '09:00', end: '18:00' };
    newSchedule[day] = {
      ...newSchedule[day],
      shifts: [...newSchedule[day].shifts, newShift],
    };
    onChange(newSchedule);
  };

  const removeShift = (day: DayOfWeek, shiftIndex: number) => {
    const newSchedule = { ...schedule };
    newSchedule[day] = {
      ...newSchedule[day],
      shifts: newSchedule[day].shifts.filter((_, i) => i !== shiftIndex),
    };
    onChange(newSchedule);
  };

  const updateShift = (
    day: DayOfWeek,
    shiftIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const newSchedule = { ...schedule };
    newSchedule[day] = {
      ...newSchedule[day],
      shifts: newSchedule[day].shifts.map((shift, i) =>
        i === shiftIndex ? { ...shift, [field]: value } : shift
      ),
    };
    onChange(newSchedule);
  };

  const toggleDayOpen = (day: DayOfWeek) => {
    setOpenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validateShift = (shift: Shift): boolean => {
    const startMinutes = timeToMinutes(shift.start);
    const endMinutes = timeToMinutes(shift.end);
    return endMinutes > startMinutes;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const hasOverlap = (shifts: Shift[], currentIndex: number): boolean => {
    const current = shifts[currentIndex];
    const currentStart = timeToMinutes(current.start);
    const currentEnd = timeToMinutes(current.end);

    return shifts.some((shift, i) => {
      if (i === currentIndex) return false;
      const start = timeToMinutes(shift.start);
      const end = timeToMinutes(shift.end);
      return !(currentEnd <= start || currentStart >= end);
    });
  };

  const renderDaySchedule = (day: DayOfWeek) => {
    const daySchedule = schedule[day];
    const isOpen = openDays.includes(day);
    const dayError = errors?.[day];

    const content = (
      <div className="space-y-3">
        {daySchedule.shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            Sin turnos configurados
          </p>
        ) : (
          daySchedule.shifts.map((shift, shiftIndex) => {
            const isInvalid = !validateShift(shift);
            const hasOverlapError = hasOverlap(daySchedule.shifts, shiftIndex);
            const shiftError = isInvalid || hasOverlapError;

            return (
              <div
                key={shiftIndex}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md bg-muted/50',
                  shiftError && 'border border-destructive bg-destructive/10'
                )}
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  value={shift.start}
                  onValueChange={(value) =>
                    updateShift(day, shiftIndex, 'start', value)
                  }
                  disabled={!daySchedule.enabled}
                >
                  <SelectTrigger className="w-24 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">-</span>
                <Select
                  value={shift.end}
                  onValueChange={(value) =>
                    updateShift(day, shiftIndex, 'end', value)
                  }
                  disabled={!daySchedule.enabled}
                >
                  <SelectTrigger className="w-24 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeShift(day, shiftIndex)}
                  disabled={!daySchedule.enabled}
                >
                  <X className="h-4 w-4" />
                </Button>
                {shiftError && (
                  <span className="text-xs text-destructive">
                    {isInvalid
                      ? 'Hora fin debe ser mayor'
                      : 'Turnos superpuestos'}
                  </span>
                )}
              </div>
            );
          })
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => addShift(day)}
          disabled={!daySchedule.enabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Turno
        </Button>
      </div>
    );

    if (isMobile) {
      return (
        <Collapsible
          key={day}
          open={isOpen}
          onOpenChange={() => toggleDayOpen(day)}
        >
          <div
            className={cn(
              'border rounded-lg overflow-hidden',
              !daySchedule.enabled && 'opacity-60',
              dayError && 'border-destructive'
            )}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-card hover:bg-accent cursor-pointer">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day-${day}`}
                    checked={daySchedule.enabled}
                    onCheckedChange={() => toggleDayEnabled(day)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={`day-${day}`}
                    className="font-medium cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {DAY_LABELS[day]}
                  </Label>
                  {daySchedule.enabled && (
                    <span className="text-xs text-muted-foreground">
                      ({daySchedule.shifts.length} turno
                      {daySchedule.shifts.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-0 border-t">{content}</div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    return (
      <div
        key={day}
        className={cn(
          'border rounded-lg p-4',
          !daySchedule.enabled && 'opacity-60 bg-muted/30',
          dayError && 'border-destructive'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`day-${day}`}
              checked={daySchedule.enabled}
              onCheckedChange={() => toggleDayEnabled(day)}
            />
            <Label htmlFor={`day-${day}`} className="font-medium cursor-pointer">
              {DAY_LABELS[day]}
            </Label>
          </div>
          {!daySchedule.enabled && (
            <span className="text-xs text-muted-foreground">Cerrado</span>
          )}
        </div>
        {daySchedule.enabled && content}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Horario Semanal</h3>
      </div>
      <div className="space-y-3">{DAYS_ORDER.map(renderDaySchedule)}</div>
    </div>
  );
}
