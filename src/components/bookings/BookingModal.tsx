import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, getDay, addMinutes, parse, isBefore, isAfter, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Booking, Client, Service } from '@/types';
import { ApiBooking } from '@/types/api';
import { Barber, BarberSchedule } from '@/types/barber';
import { useToast } from '@/hooks/use-toast';
import ClientModal from '@/components/clients/ClientModal';
import { supabaseBookingsApi } from '@/services/supabaseBookings';

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  clients: Client[];
  services: Service[];
  barbers: Barber[];
  allBookings?: Booking[];
  onSave: (booking: Partial<Booking>) => Promise<void>;
  onClientCreate?: (client: Partial<Client>) => Promise<Client>;
  selectedDate?: Date;
}

// Day of week mapping for schedule lookup
const DAY_MAP: Record<number, keyof BarberSchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// Generate time slots in 15-minute intervals
const generateAllTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 8; hour < 21; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const ALL_TIME_SLOTS = generateAllTimeSlots();

export default function BookingModal({
  open,
  onOpenChange,
  booking,
  clients,
  services,
  barbers,
  allBookings = [],
  onSave,
  onClientCreate,
  selectedDate,
}: BookingModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [existingBookings, setExistingBookings] = useState<ApiBooking[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    barberId: '',
    time: '',
    status: 'confirmed' as Booking['status'],
    source: 'phone' as Booking['source'],
    notes: '',
  });

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const searchLower = clientSearch.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchLower) ||
        client.phone.includes(clientSearch) ||
        client.email?.toLowerCase().includes(searchLower)
    );
  }, [clients, clientSearch]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const selectedBarber = barbers.find((b) => b.id === formData.barberId);

  // Fetch bookings for the selected date when barber changes
  useEffect(() => {
    const fetchBookingsForDate = async () => {
      if (!date || !formData.barberId) {
        setExistingBookings([]);
        return;
      }
      
      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const bookings = await supabaseBookingsApi.getByDateRange(dateStr, dateStr);
        // Filter bookings for this barber (or unassigned)
        const barberBookings = bookings.filter(
          (b) => b.barber === selectedBarber?.name || (!b.barber && !formData.barberId)
        );
        setExistingBookings(barberBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setExistingBookings([]);
      }
    };

    fetchBookingsForDate();
  }, [date, formData.barberId, selectedBarber?.name]);

  // Check if barber works on a specific date
  const isBarberWorkingOnDate = useCallback((checkDate: Date, barber: Barber): boolean => {
    if (!barber.schedule) return true;
    
    const dayOfWeek = getDay(checkDate);
    const dayName = DAY_MAP[dayOfWeek];
    const daySchedule = barber.schedule[dayName];
    
    if (!daySchedule?.enabled || daySchedule.shifts.length === 0) {
      return false;
    }
    
    // Check time_off
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (barber.time_off?.some(
      (to) => dateStr >= to.start_date && dateStr <= to.end_date
    )) {
      return false;
    }
    
    return true;
  }, []);

  // Get available time slots based on barber schedule and existing bookings
  const availableTimeSlots = useMemo(() => {
    if (!date || !selectedBarber?.schedule) {
      return ALL_TIME_SLOTS;
    }

    const dayOfWeek = getDay(date);
    const dayName = DAY_MAP[dayOfWeek];
    const daySchedule = selectedBarber.schedule[dayName];

    if (!daySchedule?.enabled || daySchedule.shifts.length === 0) {
      return [];
    }

    // Get all slots within barber's shifts
    const slotsInShifts: string[] = [];
    daySchedule.shifts.forEach((shift) => {
      ALL_TIME_SLOTS.forEach((slot) => {
        if (slot >= shift.start && slot < shift.end) {
          slotsInShifts.push(slot);
        }
      });
    });

    // Filter out slots that conflict with existing bookings
    const serviceDuration = selectedService?.duration || 30;
    const availableSlots = slotsInShifts.filter((slot) => {
      const slotStart = parse(slot, 'HH:mm', date);
      const slotEnd = addMinutes(slotStart, serviceDuration);

      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some((existingBooking) => {
        // Skip the booking being edited
        if (booking?.id === existingBooking.id) return false;
        
        // Only check conflicts for same barber
        if (existingBooking.barber !== selectedBarber.name) return false;

        // Parse times - API returns HH:MM:SS format
        const existingTimeStr = existingBooking.start_time.slice(0, 5);
        const existingStart = parse(existingTimeStr, 'HH:mm', date);
        const existingEnd = addMinutes(existingStart, existingBooking.service_duration || 30);

        // Check overlap
        return (
          (slotStart >= existingStart && slotStart < existingEnd) ||
          (slotEnd > existingStart && slotEnd <= existingEnd) ||
          (slotStart <= existingStart && slotEnd >= existingEnd)
        );
      });

      // Also check that the service fits within the shift
      const fitsInShift = daySchedule.shifts.some((shift) => {
        const shiftEnd = parse(shift.end, 'HH:mm', date);
        return slotEnd <= shiftEnd;
      });

      return !hasConflict && fitsInShift;
    });

    return availableSlots;
  }, [date, selectedBarber, selectedService, existingBookings, booking?.id]);

  // Disable dates where barber doesn't work
  const disabledDates = useCallback(
    (checkDate: Date) => {
      // Don't disable past dates here, let the calendar handle that
      if (!selectedBarber) return false;
      return !isBarberWorkingOnDate(checkDate, selectedBarber);
    },
    [selectedBarber, isBarberWorkingOnDate]
  );

  useEffect(() => {
    if (booking) {
      setDate(new Date(booking.date));
      setFormData({
        clientId: booking.clientId,
        serviceId: booking.serviceId,
        barberId: booking.barber ? barbers.find(b => b.name === booking.barber)?.id || '' : '',
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
        barberId: '',
        time: '',
        status: 'confirmed',
        source: 'phone',
        notes: '',
      });
    }
  }, [booking, selectedDate, open, barbers]);

  // Reset time when date or barber changes (only for new bookings)
  useEffect(() => {
    if (!booking && formData.barberId && date) {
      // Select first available slot
      if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(formData.time)) {
        setFormData((prev) => ({ ...prev, time: availableTimeSlots[0] }));
      }
    }
  }, [date, formData.barberId, availableTimeSlots, booking, formData.time]);

  // Reset date when barber changes if current date is not valid
  useEffect(() => {
    if (!booking && selectedBarber && date && !isBarberWorkingOnDate(date, selectedBarber)) {
      // Find next available date
      let nextDate = new Date();
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(nextDate);
        checkDate.setDate(checkDate.getDate() + i);
        if (isBarberWorkingOnDate(checkDate, selectedBarber)) {
          setDate(checkDate);
          break;
        }
      }
    }
  }, [selectedBarber, booking, isBarberWorkingOnDate]);

  // Handle new client creation
  const handleClientCreate = async (clientData: Partial<Client>) => {
    if (!onClientCreate) return;
    try {
      const newClient = await onClientCreate(clientData);
      setFormData({ ...formData, clientId: newClient.id });
      setShowClientModal(false);
      toast({
        title: 'Cliente creado',
        description: 'El nuevo cliente ha sido añadido',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el cliente',
        variant: 'destructive',
      });
    }
  };

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
        barber: selectedBarber?.name || null,
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
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {booking ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Client Selection with Search */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Cliente</Label>
            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientSearchOpen}
                  className="w-full justify-between font-normal h-8 text-xs"
                >
                  {selectedClient ? (
                    <span className="truncate">{selectedClient.name} - {selectedClient.phone}</span>
                  ) : (
                    <span className="text-muted-foreground">Buscar cliente...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" side="bottom" avoidCollisions={false}>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por nombre, teléfono..."
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList className="max-h-[160px]">
                    <CommandEmpty>No se encontraron clientes</CommandEmpty>

                    {/* Create New Client Option */}
                    {onClientCreate && (
                      <>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setClientSearchOpen(false);
                              setShowClientModal(true);
                            }}
                            className="text-primary"
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            <span className="font-medium text-xs">Crear nuevo cliente</span>
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                      </>
                    )}

                    {/* Client List */}
                    <CommandGroup heading="Clientes">
                      {filteredClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.id}
                          onSelect={() => {
                            setFormData({ ...formData, clientId: client.id });
                            setClientSearchOpen(false);
                            setClientSearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3.5 w-3.5',
                              formData.clientId === client.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{client.name}</span>
                            <span className="text-[10px] text-muted-foreground">{client.phone}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Service Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Servicio</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.filter((s) => s.isActive).map((service) => (
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

          {/* Barber Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Barbero</Label>
            <Select
              value={formData.barberId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, barberId: value === 'none' ? '' : value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecciona un barbero (opcional)" />
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
              <Label className="text-xs font-medium">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-8 text-xs',
                      !date && 'text-muted-foreground',
                      !formData.barberId && 'opacity-60'
                    )}
                    disabled={!formData.barberId}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {!formData.barberId
                        ? 'Barbero primero'
                        : date
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
                    disabled={disabledDates}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Hora</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
                disabled={!formData.barberId || !date || availableTimeSlots.length === 0}
              >
                <SelectTrigger className={cn(
                  "h-8 text-xs",
                  (!formData.barberId || !date) && 'opacity-60'
                )}>
                  <SelectValue placeholder={
                    !formData.barberId
                      ? 'Barbero'
                      : !date
                        ? 'Fecha'
                        : availableTimeSlots.length === 0
                          ? 'Sin horas'
                          : 'Hora'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.barberId && date && availableTimeSlots.length === 0 && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Sin horas disponibles
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Solicitudes especiales o notas..."
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          {/* Summary */}
          {selectedService && (
            <div className="bg-muted/50 rounded-lg p-2.5 space-y-0.5">
              <p className="text-[10px] text-muted-foreground font-medium">Resumen de la cita</p>
              <div className="flex justify-between text-xs">
                <span>{selectedService.name}</span>
                <span className="font-medium">€{selectedService.price}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Duración</span>
                <span>{selectedService.duration} minutos</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8" disabled={isLoading}>
              {isLoading ? 'Guardando...' : booking ? 'Actualizar' : 'Crear Cita'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Nested Client Creation Modal */}
      {onClientCreate && (
        <ClientModal
          open={showClientModal}
          onOpenChange={setShowClientModal}
          onSave={handleClientCreate}
        />
      )}
    </Dialog>
  );
}
