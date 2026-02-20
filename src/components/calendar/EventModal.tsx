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

// ==================== Constants ====================

const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 7; hour < 22; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(
        `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      );
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

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
  defaultBarberId,
}: EventModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    repeat: 'none' as ApiEventRepeat,
    location: '',
    notes: '',
    barberId: '',
    color: '#d1d5db',
  });

  // Populate form when the modal opens
  useEffect(() => {
    if (!open) return;

    if (event) {
      // Edit mode: pre-populate all fields from the existing event
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
        color: event.color || '#d1d5db',
      });
    } else {
      // Create mode: use slot time or current time
      let startTime: string;
      if (selectedTime) {
        startTime = selectedTime;
      } else {
        const now = new Date();
        startTime = `${now.getHours().toString().padStart(2, '0')}:${(Math.ceil(now.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0')}`;
      }
      const [startH, startM] = startTime.split(':').map(Number);
      const endH = startH + Math.floor((startM + 60) / 60);
      const endM = (startM + 60) % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

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
        color: '#d1d5db',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Filtered end time slots (must be after start)
  const endTimeSlots = useMemo(() => {
    if (!formData.startTime) return TIME_SLOTS;
    return TIME_SLOTS.filter((t) => t > formData.startTime);
  }, [formData.startTime]);

  const selectedBarber = barbers.find((b) => b.id === formData.barberId);

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
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-violet-600" />
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              autoFocus
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
                      prev.endTime <= value
                        ? TIME_SLOTS[
                            Math.min(
                              TIME_SLOTS.indexOf(value) + 4,
                              TIME_SLOTS.length - 1
                            )
                          ]
                        : prev.endTime,
                  }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Inicio" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
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
              Barbero{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Select
              value={formData.barberId || 'none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  barberId: value === 'none' ? '' : value,
                })
              }
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
            <div className="flex gap-2 flex-wrap">
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
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
