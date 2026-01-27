import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Scissors } from 'lucide-react';
import { es } from 'date-fns/locale';
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
import { Booking, Client, Service } from '@/types';
import { useToast } from '@/hooks/use-toast';
interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  clients: Client[];
  services: Service[];
  onSave: (booking: Partial<Booking>) => Promise<void>;
  selectedDate?: Date;
}

const timeSlots = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}).filter((time) => {
  const hour = parseInt(time.split(':')[0]);
  return hour >= 8 && hour < 20;
});

export default function BookingModal({
  open,
  onOpenChange,
  booking,
  clients,
  services,
  onSave,
  selectedDate,
}: BookingModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    time: '09:00',
    status: 'confirmed' as Booking['status'],
    source: 'phone' as Booking['source'],
    notes: '',
  });

  useEffect(() => {
    if (booking) {
      setDate(new Date(booking.date));
      setFormData({
        clientId: booking.clientId,
        serviceId: booking.serviceId,
        time: booking.time,
        status: booking.status,
        source: booking.source,
        notes: booking.notes || '',
      });
    } else {
      setDate(selectedDate || new Date());
      setFormData({
        clientId: '',
        serviceId: '',
        time: '09:00',
        status: 'confirmed',
        source: 'phone',
        notes: '',
      });
    }
  }, [booking, selectedDate, open]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedClient = clients.find((c) => c.id === formData.clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !formData.clientId || !formData.serviceId) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        ...booking,
        clientId: formData.clientId,
        clientName: selectedClient?.name || '',
        clientPhone: selectedClient?.phone || '',
        clientEmail: selectedClient?.email || '',
        serviceId: formData.serviceId,
        serviceName: selectedService?.name || '',
        serviceDuration: selectedService?.duration || 30,
        servicePrice: selectedService?.price || 0,
        date: format(date, 'yyyy-MM-dd'),
        time: formData.time,
        status: formData.status,
        source: formData.source,
        notes: formData.notes,
      });
      
      // Notifications are now handled by Supabase backend triggers
      
      onOpenChange(false);
      toast({
        title: booking ? 'Cita actualizada' : 'Cita creada',
        description: `La cita se ha ${booking ? 'actualizado' : 'programado'} correctamente`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la cita',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {booking ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => setFormData({ ...formData, clientId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} - {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Servicio
            </Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.filter((s) => s.isActive).map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground text-sm">
                        {service.duration}min • €{service.price}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: es }) : 'Selecciona fecha'}
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora
              </Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Booking['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="no-show">No asistió</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origen</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value as Booking['source'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                  <SelectItem value="walk-in">Sin cita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Solicitudes especiales o notas..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedService && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-muted-foreground">Resumen de la cita</p>
              <div className="flex justify-between text-sm">
                <span>{selectedService.name}</span>
                <span className="font-medium">€{selectedService.price}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Duración</span>
                <span>{selectedService.duration} minutos</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : booking ? 'Actualizar' : 'Crear Cita'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
