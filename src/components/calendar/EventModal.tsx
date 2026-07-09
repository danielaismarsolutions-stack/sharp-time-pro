// Modal for creating / editing calendar events
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Calendar as CalendarIcon, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Barber } from '@/types/barber';
import { ApiCalendarEvent, ApiEventRepeat } from '@/types/api';
import { useToast } from '@/hooks/use-toast';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { getBarberHexColor, DEFAULT_EVENT_HEX } from '@/components/calendar/shared/colorUtils';
import { END_OF_DAY } from '@/components/calendar/shared/slotTimeUtils';

// ==================== Constants ====================

const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(
        `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      );
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// End-time options: an event can't end at 00:00 but can run until 23:59
const END_TIME_SLOTS = [...TIME_SLOTS.slice(1), END_OF_DAY];

const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const LAST_SLOT_START_MINUTES = 23 * 60 + 45;

const formatSlot = (hour: number, minute: number) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

// Round up to the next 15-minute slot, clamped to the day's last slot (23:45)
// so times near midnight don't wrap around to 00:00
const roundUpToSlot = (date: Date): string => {
  const totalMins = Math.min(
    date.getHours() * 60 + Math.ceil(date.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES,
    LAST_SLOT_START_MINUTES
  );
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return formatSlot(h, m);
};

// Add one hour to a slot string; when that would pass midnight (or the slot is
// off-grid), end at 23:59 so the result is always after the start
const addHourClamped = (slot: string): string => {
  const idx = TIME_SLOTS.indexOf(slot);
  const target = idx + SLOTS_PER_HOUR;
  if (idx === -1 || target >= TIME_SLOTS.length) return END_OF_DAY;
  return TIME_SLOTS[target];
};

const EVENT_COLORS: { label: string; value: string; tw: string }[] = [
  { label: 'Gris', value: '#d1d5db', tw: 'bg-gray-300' },
  { label: 'Azul', value: '#93c5fd', tw: 'bg-blue-300' },
  { label: 'Verde', value: '#86efac', tw: 'bg-green-300' },
  { label: 'Amarillo', value: '#fde68a', tw: 'bg-yellow-300' },
  { label: 'Naranja', value: '#fdba74', tw: 'bg-orange-300' },
  { label: 'Rosa', value: '#f9a8d4', tw: 'bg-pink-300' },
  { label: 'Morado', value: '#c4b5fd', tw: 'bg-violet-300' },
  { label: 'Rojo', value: '#fca5a5', tw: 'bg-red-300' },
];

// ==================== Props ====================

export interface EventFormData {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  repeat: ApiEventRepeat;
  location: string;
  notes: string;
  barber: string | null;
  barberId: string | null;
  color: string;
}

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ApiCalendarEvent | null;
  barbers: Barber[];
  onSave: (data: EventFormData) => Promise<void>;
  selectedDate?: Date;
  selectedTime?: string; // HH:mm format
  selectedEndTime?: string; // HH:mm format (from drag selection)
  defaultBarberId?: string; // Pre-select barber (e.g. the logged-in user)
}

// ==================== Component ====================

export function EventModal({
  open,
  onOpenChange,
  event,
  barbers,
  onSave,
  selectedDate,
  selectedTime,
  selectedEndTime,
  defaultBarberId,
}: EventModalProps) {
  const { toast } = useToast();
  const staffTerms = useStaffTerms();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  // Empty `color` = "auto" (renders with the assigned barber's color); a hex
  // means the user picked a manual override.
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    repeat: 'none' as ApiEventRepeat,
    location: '',
    notes: '',
    barberId: '',
    color: '',
  });

  // Populate form when the modal opens
  useEffect(() => {
    if (!open) return;

    if (event) {
      // Edit mode: pre-populate all fields from the existing event. Keep
      // `color` empty when the event is in auto mode so it follows the
      // assigned barber's color.
      setDate(new Date(event.event_date + 'T00:00:00'));
      const barberObj = barbers.find((b) => b.name === event.barber);
      setFormData({
        name: event.name,
        startTime: event.start_time.substring(0, 5),
        endTime: event.end_time.substring(0, 5),
        repeat: event.repeat,
        location: event.location || '',
        notes: event.notes || '',
        barberId: barberObj?.id || '',
        color: event.color || '',
      });
    } else {
      // Create mode: use slot time or current time
      const startTime = selectedTime ?? roundUpToSlot(new Date());
      const endTime = selectedEndTime ?? addHourClamped(startTime);

      // Default barber to the logged-in user if they exist in the barbers list
      const resolvedBarberId = defaultBarberId && barbers.some((b) => b.id === defaultBarberId)
        ? defaultBarberId
        : '';

      setDate(selectedDate || new Date());
      setFormData({
        name: '',
        startTime,
        endTime,
        repeat: 'none',
        location: '',
        notes: '',
        barberId: resolvedBarberId,
        color: '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start slots, including the incoming time when it's off the 15-min grid
  // (e.g. an event dragged to a 5-min offset keeps its time when edited).
  // Derived from props — not form state — so the extra option is registered
  // before the Select value points at it (otherwise Radix resets the value).
  const startTimeSlots = useMemo(() => {
    const extra = event ? event.start_time.substring(0, 5) : selectedTime;
    if (extra && !TIME_SLOTS.includes(extra)) {
      return [...TIME_SLOTS, extra].sort();
    }
    return TIME_SLOTS;
  }, [event, selectedTime]);

  // Filtered end time slots (must be after start; 23:59 is always available)
  const endTimeSlots = useMemo(() => {
    const extra = event ? event.end_time.substring(0, 5) : selectedEndTime;
    const base =
      extra && !END_TIME_SLOTS.includes(extra)
        ? [...END_TIME_SLOTS, extra].sort()
        : END_TIME_SLOTS;
    if (!formData.startTime) return base;
    return base.filter((t) => t > formData.startTime);
  }, [event, selectedEndTime, formData.startTime]);

  const selectedBarber = barbers.find((b) => b.id === formData.barberId);
  // Color the "Auto" chip displays — matches what the event will render as
  // when no manual override is set.
  const autoColor = selectedBarber
    ? getBarberHexColor(selectedBarber.name)
    : DEFAULT_EVENT_HEX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor, ingresa un nombre para el evento',
        variant: 'destructive',
      });
      return;
    }

    if (!date || !formData.startTime || !formData.endTime) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, completa la fecha y horarios',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: formData.startTime,
        endTime: formData.endTime,
        repeat: formData.repeat,
        location: formData.location.trim(),
        notes: formData.notes.trim(),
        barber: selectedBarber?.name || null,
        barberId: selectedBarber?.id || null,
        color: formData.color,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el evento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-h-[calc(100dvh-1rem)] flex flex-col gap-0 p-0"
        onOpenAutoFocus={(e) => {
          if (event) e.preventDefault();
        }}
      >
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-violet-600" />
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="space-y-3 overflow-y-auto px-4 pb-2 flex-1">
          {/* Event Name */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Nombre del evento</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej: Reunión de equipo, Limpieza..."
              className="h-8 text-xs"
              autoFocus={!event}
            />
          </div>

          {/* Date & Times */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-8 text-xs',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {date
                      ? format(date, "d 'de' MMM yyyy", { locale: es })
                      : 'Selecciona fecha'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Hora inicio</Label>
              <Select
                value={formData.startTime}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    startTime: value,
                    // Auto-adjust end time if needed
                    endTime:
                      prev.endTime <= value ? addHourClamped(value) : prev.endTime,
                  }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Inicio" />
                </SelectTrigger>
                <SelectContent>
                  {startTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Hora fin</Label>
              <Select
                value={formData.endTime}
                onValueChange={(value) =>
                  setFormData({ ...formData, endTime: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Fin" />
                </SelectTrigger>
                <SelectContent>
                  {endTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Repeat */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Repetir</Label>
            <Select
              value={formData.repeat}
              onValueChange={(value) =>
                setFormData({ ...formData, repeat: value as ApiEventRepeat })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Solo una vez</SelectItem>
                <SelectItem value="daily">Todos los días</SelectItem>
                <SelectItem value="weekly">Cada semana</SelectItem>
                <SelectItem value="monthly">Cada mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Ubicación{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Input
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Ej: Sala principal, Dirección..."
              className="h-8 text-xs"
            />
          </div>

          {/* Barber */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {staffTerms.singularCap}{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Select
              value={formData.barberId || 'none'}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  barberId: value === 'none' ? '' : value,
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Notas{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Detalles del evento..."
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <div className="flex gap-2 flex-wrap items-center">
              {/* Auto chip — follows the assigned barber's color */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, color: '' })}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center',
                  formData.color === ''
                    ? 'border-foreground scale-110'
                    : 'border-dashed border-foreground/40 hover:scale-105'
                )}
                style={{ backgroundColor: autoColor }}
                title={
                  selectedBarber
                    ? `Automático (color de ${staffTerms.singular})`
                    : 'Automático'
                }
              >
                {formData.color === '' && (
                  <Check className="h-3.5 w-3.5 text-foreground/80" />
                )}
              </button>
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, color: c.value })
                  }
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center',
                    formData.color === c.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {formData.color === c.value && (
                    <Check className="h-3.5 w-3.5 text-foreground/80" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {selectedBarber
                ? `Por defecto sigue el color de ${staffTerms.singular}. Elige un color para fijarlo.`
                : 'Sin color fijo. Elige un color para fijarlo.'}
            </p>
          </div>

          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-card shrink-0 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8"
              disabled={isLoading}
            >
              {isLoading
                ? 'Guardando...'
                : event
                  ? 'Actualizar'
                  : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EventModal;
