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
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { supabaseBookingsApi, CreateBookingData } from '@/services/supabaseBookings';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { supabaseClientsApi } from '@/services/supabaseClients';
import { notifyBookingUsers } from '@/services/supabaseNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';

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
  const { user } = useAuth();
  const staffTerms = useStaffTerms();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ start: string; end: string }[]>([]);
  
  const [formData, setFormData] = useState({
    serviceId: '',
    barberId: '',
    time: '',
    notes: '',
    customDuration: 60,
    customPrice: 0,
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

  // Fetch booked slots when date or barber changes
  useEffect(() => {
    if (date && formData.barberId && formData.barberId !== '') {
      const fetchBookedSlots = async () => {
        setIsLoadingSlots(true);
        try {
          const selectedBarberObj = barbers.find((b) => b.id === formData.barberId);
          if (!selectedBarberObj) return;
          
          const bookings = await supabaseBookingsApi.getAll({
            date: format(date, 'yyyy-MM-dd'),
            barber: selectedBarberObj.name,
          });
          
          // Filter out cancelled bookings and extract time slots
          const slots = bookings
            .filter(b => b.status !== 'cancelled')
            .map(b => ({
              start: b.start_time.slice(0, 5),
              end: b.end_time.slice(0, 5),
            }));
          
          setBookedSlots(slots);
          
          // Reset time if currently selected time is no longer available
          if (formData.time && isTimeSlotBooked(formData.time, slots)) {
            setFormData(prev => ({ ...prev, time: '' }));
          }
        } catch { /* ignored */ } finally {
          setIsLoadingSlots(false);
        }
      };
      fetchBookedSlots();
    } else {
      setBookedSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, formData.barberId, barbers]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedBarber = barbers.find((b) => b.id === formData.barberId);

  // Services with variable duration
  const variableDurationServices = ['mechas / color', 'tattoo & piercing'];
  const isVariableDuration = selectedService && 
    variableDurationServices.includes(selectedService.name.toLowerCase());
  
  // Get effective duration and price (custom for variable services, default otherwise)
  const effectiveDuration = isVariableDuration ? formData.customDuration : (selectedService?.duration || 30);
  const effectivePrice = isVariableDuration ? formData.customPrice : (selectedService?.price || 0);

  // Duration options for variable services
  const durationOptions = [30, 45, 60, 90, 120, 150, 180];

  // Check if a time slot overlaps with booked slots
  const isTimeSlotBooked = (time: string, slots: { start: string; end: string }[] = bookedSlots): boolean => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotStart = hours * 60 + minutes;
    const slotEnd = slotStart + effectiveDuration;
    
    return slots.some(booking => {
      const [bStartH, bStartM] = booking.start.split(':').map(Number);
      const [bEndH, bEndM] = booking.end.split(':').map(Number);
      const bookingStart = bStartH * 60 + bStartM;
      const bookingEnd = bEndH * 60 + bEndM;
      
      // Check for overlap
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  // Get available time slots
  const availableTimeSlots = timeSlots.filter(time => !isTimeSlotBooked(time));

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
    
    if (!date || !formData.serviceId || !formData.time) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, selecciona fecha, servicio y hora',
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
      const clientId = await findOrCreateClient();
      
      const startTime = formData.time + ':00';
      const endTime = calculateEndTime(formData.time, effectiveDuration) + ':00';

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
        service_duration: effectiveDuration,
        service_price: effectivePrice,
        barber: selectedBarber?.name || null,
        notes: formData.notes || `Reserva desde consulta: ${consultation.client_notes || ''}`.trim(),
      };

      const newBooking = await supabaseBookingsApi.create(bookingData);
      
      // Notify admins + barber about booking from consultation
      try {
        await notifyBookingUsers({
          business_id: getBusinessId(),
          type: 'booking_created',
          title: 'Nueva reserva desde consulta',
          message: `${consultation.client_name} ha reservado ${selectedService.name} con ${selectedBarber?.name || 'Sin asignar'} para el ${format(date, "dd/MM/yyyy", { locale: es })} a las ${formData.time}`,
          barber_user_id: formData.barberId || newBooking.user_id,
          performed_by_user_id: user?.id || '',
          metadata: {
            booking_id: newBooking.id,
            consultation_id: consultation.id,
            client_name: consultation.client_name,
            service_name: selectedService.name,
            booking_date: format(date, 'yyyy-MM-dd'),
            start_time: formData.time,
          },
        });
      } catch { /* ignored */ }
      
      toast({
        title: 'Cita creada',
        description: `Cita programada para ${format(date, "dd/MM/yyyy", { locale: es })} a las ${formData.time}`,
      });
      
      onBooked();
      onOpenChange(false);
    } catch (error) {
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Convertir a Reserva
          </DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Client Info (read-only) */}
            <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Datos del cliente
              </p>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p><strong>Nombre:</strong> {consultation.client_name}</p>
                <p><strong>Teléfono:</strong> {consultation.client_phone}</p>
                {consultation.client_email && (
                  <p><strong>Email:</strong> {consultation.client_email}</p>
                )}
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <Scissors className="h-3 w-3" />
                Servicio
              </Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecciona un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="text-xs">{service.name}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {service.duration}min • €{service.price}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration & Price Selection (for variable duration services) */}
            {isVariableDuration && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3 w-3" />
                    Duración
                  </Label>
                  <Select
                    value={formData.customDuration.toString()}
                    onValueChange={(value) => setFormData({ ...formData, customDuration: parseInt(value) })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((duration) => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <span>€</span>
                    Precio
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.customPrice}
                    onChange={(e) => setFormData({ ...formData, customPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <User className="h-3 w-3" />
                {staffTerms.singularCap}
              </Label>
              <Select
                value={formData.barberId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, barberId: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={`Selecciona un ${staffTerms.singular} (opcional)`} />
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

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-8 text-xs',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {date ? format(date, "d MMM yyyy", { locale: es }) : 'Selecciona fecha'}
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

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  Hora
                  {isLoadingSlots && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                </Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => setFormData({ ...formData, time: value })}
                  disabled={isLoadingSlots}
                >
                  <SelectTrigger className={cn("h-8 text-xs", !formData.time && 'text-muted-foreground')}>
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.barberId ? (
                      availableTimeSlots.length > 0 ? (
                        availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-[10px] text-muted-foreground text-center">
                          No hay horarios disponibles
                        </div>
                      )
                    ) : (
                      timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.barberId && bookedSlots.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {bookedSlots.length} cita(s) ocupada(s)
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notas adicionales</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales para la cita..."
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Original consultation note */}
            {consultation.client_notes && (
              <div className="bg-muted/30 rounded-lg p-2 space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground">Nota original del cliente:</p>
                <p className="text-[11px] text-foreground">{consultation.client_notes}</p>
              </div>
            )}

            {/* Summary */}
            {selectedService && date && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 space-y-0.5">
                <p className="text-xs font-medium">Resumen de la cita</p>
                <div className="flex justify-between text-xs">
                  <span>{selectedService.name}</span>
                  <span className="font-medium">€{effectivePrice}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Fecha y hora</span>
                  <span>{format(date, 'dd/MM/yyyy', { locale: es })} a las {formData.time}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Duración</span>
                  <span>{effectiveDuration} min</span>
                </div>
                {selectedBarber && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{staffTerms.singularCap}</span>
                    <span>{selectedBarber.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8" disabled={isLoading || !formData.serviceId || !formData.time}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
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
