import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Scissors, Loader2 } from 'lucide-react';
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
import { Consultation } from '@/types/consultation';
import { Service } from '@/types';
import { Barber } from '@/types/barber';
import { useToast } from '@/hooks/use-toast';
import { supabaseBookingsApi, CreateBookingData } from '@/services/supabaseBookings';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { supabaseClientsApi } from '@/services/supabaseClients';

interface ConsultationBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: Consultation;
  onBooked: () => void;
}

const timeSlots = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}).filter((time) => {
  const hour = parseInt(time.split(':')[0]);
  return hour >= 8 && hour < 20;
});

export function ConsultationBookingModal({
  open,
  onOpenChange,
  consultation,
  onBooked,
}: ConsultationBookingModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  
  const [formData, setFormData] = useState({
    serviceId: '',
    barberId: '',
    time: '09:00',
    notes: '',
  });

  // Load services and barbers
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          const [servicesData, barbersData] = await Promise.all([
            supabaseServicesApi.getAll(false),
            supabaseBarbersApi.getAll(false),
          ]);
          setServices(servicesData);
          setBarbers(barbersData);
          
          // Pre-select service based on consultation service_name
          const matchingService = servicesData.find(
            s => s.name.toLowerCase() === consultation.service_name.toLowerCase()
          );
          if (matchingService) {
            setFormData(prev => ({ ...prev, serviceId: matchingService.id }));
          }
        } catch (error) {
          console.error('Error loading data:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los datos',
            variant: 'destructive',
          });
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [open, consultation.service_name, toast]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedBarber = barbers.find((b) => b.id === formData.barberId);

  // Calculate end time based on service duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !formData.serviceId) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, selecciona fecha y servicio',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedService) {
      toast({
        title: 'Error',
        description: 'Servicio no encontrado',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, find or create client
      let clientId = await findOrCreateClient();
      
      const startTime = formData.time + ':00';
      const endTime = calculateEndTime(formData.time, selectedService.duration) + ':00';

      const bookingData: CreateBookingData = {
        client_id: clientId,
        service_id: formData.serviceId,
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        source: 'online',
        client_name: consultation.client_name,
        client_phone: consultation.client_phone.replace(/^\+34/, ''),
        client_email: consultation.client_email,
        service_name: selectedService.name,
        service_duration: selectedService.duration,
        service_price: selectedService.price,
        barber: selectedBarber?.name || null,
        notes: formData.notes || `Reserva desde consulta: ${consultation.client_notes || ''}`.trim(),
      };

      await supabaseBookingsApi.create(bookingData);
      
      toast({
        title: 'Cita creada',
        description: `Cita programada para ${format(date, "dd/MM/yyyy", { locale: es })} a las ${formData.time}`,
      });
      
      onBooked();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la cita',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const findOrCreateClient = async (): Promise<string> => {
    // Try to find existing client by phone
    const clients = await supabaseClientsApi.getAll();
    const cleanPhone = consultation.client_phone.replace(/^\+34/, '').replace(/\D/g, '');
    
    const existingClient = clients.find(c => 
      c.phone.replace(/\D/g, '') === cleanPhone
    );
    
    if (existingClient) {
      return existingClient.id;
    }
    
    // Create new client
    const newClient = await supabaseClientsApi.create({
      name: consultation.client_name,
      phone: cleanPhone,
      email: consultation.client_email || '',
      notes: '',
      tags: [],
    });
    
    return newClient.id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Convertir a Reserva
          </DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Info (read-only) */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos del cliente
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Nombre:</strong> {consultation.client_name}</p>
                <p><strong>Teléfono:</strong> {consultation.client_phone}</p>
                {consultation.client_email && (
                  <p><strong>Email:</strong> {consultation.client_email}</p>
                )}
              </div>
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
                  {services.map((service) => (
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

            {/* Barber Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Barbero
              </Label>
              <Select
                value={formData.barberId}
                onValueChange={(value) => setFormData({ ...formData, barberId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un barbero (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales para la cita..."
                rows={2}
              />
            </div>

            {/* Original consultation note */}
            {consultation.client_notes && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-muted-foreground">Nota original del cliente:</p>
                <p className="text-foreground">{consultation.client_notes}</p>
              </div>
            )}

            {/* Summary */}
            {selectedService && date && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Resumen de la cita</p>
                <div className="flex justify-between text-sm">
                  <span>{selectedService.name}</span>
                  <span className="font-medium">€{selectedService.price}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Fecha y hora</span>
                  <span>{format(date, 'dd/MM/yyyy', { locale: es })} a las {formData.time}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Duración</span>
                  <span>{selectedService.duration} minutos</span>
                </div>
                {selectedBarber && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Barbero</span>
                    <span>{selectedBarber.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !formData.serviceId}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Cita'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
