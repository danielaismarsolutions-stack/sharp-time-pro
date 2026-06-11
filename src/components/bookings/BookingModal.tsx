import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, getDay, addMinutes, parse, isBefore, isAfter, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Check, ChevronsUpDown, AlertCircle, X } from 'lucide-react';
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
import { useStaffTerms } from '@/hooks/useStaffTerms';
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
  selectedTime?: string; // HH:mm format
  /** When true, date/time/barber are pre-filled from a calendar slot click/drag */
  isSlotCreation?: boolean;
  /** Barber name from the calendar filter (null = "Todos") */
  preselectedBarberName?: string | null;
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

// Generate 15-minute time slots covering the full 24h day. Used for the
// start-time picker when creating a booking from a calendar slot (scroll/drag):
// the calendar spans 0:00–23:00, so a slot can fall outside the barber's
// business hours and we must still offer/preselect that time.
const generateFullDayTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const FULL_DAY_TIME_SLOTS = generateFullDayTimeSlots();

// Generate 5-minute time slots covering the full day for the edit-mode
// start/end time dropdowns. Edit mode allows full freedom (no availability
// filtering), so users can pick any time even outside business hours.
const generateEditTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 5) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const EDIT_TIME_SLOTS = generateEditTimeSlots();

// Add `duration` minutes to a HH:mm time string, returning HH:mm.
const addMinutesToTime = (time: string, duration: number): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + duration;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Lowercase and strip diacritics for accent-insensitive matching
// (so "jose" matches "José").
const normalizeText = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Keep only digits so phone numbers match regardless of formatting
// (so "600123456" matches "+34 600 123 456").
const digitsOnly = (value: string): string => value.replace(/\D/g, '');

// Resolve which client record a booking refers to. Prefers the linked
// client_id, but falls back to matching the booking's stored phone (then name)
// so bookings without a linked client_id — created from the online widget,
// imported, or converted from a consultation — still preselect the correct
// client when editing. Returns '' when no match is found.
const resolveBookingClientId = (booking: Booking, clients: Client[]): string => {
  if (booking.clientId && clients.some((c) => c.id === booking.clientId)) {
    return booking.clientId;
  }

  const bookingDigits = digitsOnly(booking.clientPhone || '');
  if (bookingDigits) {
    const byPhone = clients.find((c) => digitsOnly(c.phone) === bookingDigits);
    if (byPhone) return byPhone.id;
  }

  const bookingName = normalizeText(booking.clientName || '').trim();
  if (bookingName) {
    const byName = clients.find((c) => normalizeText(c.name).trim() === bookingName);
    if (byName) return byName.id;
  }

  return booking.clientId || '';
};

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
  selectedTime,
  isSlotCreation = false,
  preselectedBarberName,
}: BookingModalProps) {
  const { toast } = useToast();
  const staffTerms = useStaffTerms();
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
    endTime: '',
    status: 'confirmed' as Booking['status'],
    source: 'phone' as Booking['source'],
    notes: '',
  });

  // Filter clients based on search.
  // - Accent-insensitive (so "jose" matches "José")
  // - Phone matched by digits only (so "600123456" matches "+34 600 123 456")
  // - Multi-word: every term must appear in name/email (so "juan perez"
  //   matches "Juan García Pérez")
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim();
    if (!query) return clients;

    const terms = normalizeText(query).split(/\s+/).filter(Boolean);
    const queryDigits = digitsOnly(query);

    return clients.filter((client) => {
      const haystack = normalizeText(`${client.name} ${client.email ?? ''}`);
      const nameEmailMatch = terms.every((term) => haystack.includes(term));

      const phoneMatch =
        queryDigits.length > 0 &&
        digitsOnly(client.phone).includes(queryDigits);

      return nameEmailMatch || phoneMatch;
    });
  }, [clients, clientSearch]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const selectedBarber = barbers.find((b) => b.id === formData.barberId);

  // Filter barbers based on selected service's barber assignments
  const availableBarbers = useMemo(() => {
    if (!formData.serviceId) return barbers;
    const service = services.find(s => s.id === formData.serviceId);
    if (!service?.barberIds || service.barberIds.length === 0) return barbers;
    return barbers.filter(b => service.barberIds!.includes(b.id));
  }, [formData.serviceId, barbers, services]);

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

  // Time options for the start-time picker when creating a booking.
  // - Slot creation (calendar scroll/drag): allow ANY time of the day so the
  //   appointment can be placed outside the barber's business hours, and make
  //   sure the exact time the user picked on the calendar is present so it
  //   stays preselected even when it falls outside those hours.
  // - "+" button flow: keep suggesting the barber's available slots, but still
  //   include the current selection if it somehow isn't among them.
  const newBookingTimeSlots = useMemo(() => {
    const base = isSlotCreation ? FULL_DAY_TIME_SLOTS : availableTimeSlots;
    if (formData.time && !base.includes(formData.time)) {
      return [...base, formData.time].sort();
    }
    return base;
  }, [isSlotCreation, availableTimeSlots, formData.time]);

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
        // Resolve the client by id, falling back to phone/name so bookings
        // whose client_id is null or not in the loaded list still preselect
        // the right client when editing.
        clientId: resolveBookingClientId(booking, clients),
        serviceId: booking.serviceId,
        barberId: booking.barber ? barbers.find(b => b.name === booking.barber)?.id || '' : '',
        time: booking.time,
        endTime: booking.endTime || addMinutesToTime(booking.time, booking.serviceDuration || 30),
        status: booking.status,
        source: booking.source,
        notes: booking.notes || '',
      });
    } else {
      setDate(selectedDate || new Date());
      // Pre-select barber when creating from a slot drag
      let preselectedBarberId = '';
      if (isSlotCreation && preselectedBarberName) {
        const found = barbers.find((b) => b.name === preselectedBarberName);
        if (found) preselectedBarberId = found.id;
      }
      setFormData({
        clientId: '',
        serviceId: '',
        barberId: preselectedBarberId,
        time: selectedTime || '',
        endTime: '',
        status: 'confirmed',
        source: 'phone',
        notes: '',
      });
    }
    // `clients` is intentionally omitted: it is read only to resolve the
    // preselected client on open. Including it would re-run this effect (and
    // wipe in-progress edits) whenever the list changes, e.g. after creating
    // a client inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking, selectedDate, selectedTime, isSlotCreation, preselectedBarberName, open, barbers]);

  // Reset time when date or barber changes (only for new bookings via + button)
  useEffect(() => {
    if (!booking && !isSlotCreation && formData.barberId && date) {
      // Select first available slot
      if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(formData.time)) {
        setFormData((prev) => ({ ...prev, time: availableTimeSlots[0] }));
      }
    }
  }, [date, formData.barberId, availableTimeSlots, booking, formData.time, isSlotCreation]);

  // Reset date when barber changes if current date is not valid (only for + button flow)
  useEffect(() => {
    if (!booking && !isSlotCreation && selectedBarber && date && !isBarberWorkingOnDate(date, selectedBarber)) {
      // Find next available date
      const nextDate = new Date();
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(nextDate);
        checkDate.setDate(checkDate.getDate() + i);
        if (isBarberWorkingOnDate(checkDate, selectedBarber)) {
          setDate(checkDate);
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarber, booking, isBarberWorkingOnDate, isSlotCreation]);

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

    // Only validate end time in edit mode (where the user controls it directly)
    if (booking && formData.endTime && formData.endTime <= formData.time) {
      toast({
        title: 'Horario inválido',
        description: 'La hora de fin debe ser posterior a la hora de inicio',
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
        barberId: selectedBarber?.id || null,
        barber: selectedBarber?.name || null,
        date: format(date, 'yyyy-MM-dd'),
        time: formData.time,
        endTime: booking ? formData.endTime : undefined,
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
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {booking ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Client Selection with Search.
              Rendered inline (not in a portaled Popover) so the search input
              stays inside the Dialog's focus trap and the list scrolls
              normally: a Popover portaled outside DialogContent gets its
              scroll blocked by the dialog's scroll lock and its input can
              lose focus on touch devices. */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Cliente</Label>
            {!clientSearchOpen ? (
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={clientSearchOpen}
                onClick={() => setClientSearchOpen(true)}
                className="w-full justify-between font-normal h-8 text-xs"
              >
                {selectedClient ? (
                  <span className="truncate">{selectedClient.name} - {selectedClient.phone}</span>
                ) : booking?.clientName ? (
                  // Fallback for bookings whose client has no matching record:
                  // show the name stored on the booking instead of going blank.
                  <span className="truncate">
                    {booking.clientName}{booking.clientPhone ? ` - ${booking.clientPhone}` : ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Buscar cliente...</span>
                )}
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            ) : (
              <div className="rounded-md border">
                <Command shouldFilter={false}>
                  <div className="relative">
                    <CommandInput
                      autoFocus
                      placeholder="Buscar por nombre, teléfono..."
                      value={clientSearch}
                      onValueChange={setClientSearch}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setClientSearchOpen(false);
                        setClientSearch('');
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      aria-label="Cerrar búsqueda"
                    >
                      <X className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </div>
                  <CommandList className="max-h-[200px]">
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
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Servicio</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => {
                const service = services.find(s => s.id === value);
                const validBarberIds = service?.barberIds;
                const barberStillValid = !validBarberIds || validBarberIds.length === 0 || validBarberIds.includes(formData.barberId);
                // When editing, recalculate endTime from the new service's duration
                // so any previous custom end time is reset.
                const nextEndTime = booking && formData.time && service?.duration
                  ? addMinutesToTime(formData.time, service.duration)
                  : formData.endTime;
                setFormData({
                  ...formData,
                  serviceId: value,
                  barberId: barberStillValid ? formData.barberId : '',
                  endTime: nextEndTime,
                });
              }}
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
            <Label className="text-xs font-medium">{staffTerms.singularCap}</Label>
            <Select
              value={formData.barberId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, barberId: value === 'none' ? '' : value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={`Selecciona un ${staffTerms.singular} (opcional)`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {availableBarbers.map((barber) => (
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
                      !isSlotCreation && !formData.barberId && 'opacity-60'
                    )}
                    disabled={!isSlotCreation && !formData.barberId}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {!isSlotCreation && !formData.barberId
                        ? `${staffTerms.singularCap} primero`
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

            {!booking && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Hora</Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => setFormData({ ...formData, time: value })}
                  disabled={!isSlotCreation && (!formData.barberId || !date || availableTimeSlots.length === 0)}
                >
                  <SelectTrigger className={cn(
                    "h-8 text-xs",
                    !isSlotCreation && (!formData.barberId || !date) && 'opacity-60'
                  )}>
                    <SelectValue placeholder={
                      !isSlotCreation && !formData.barberId
                        ? staffTerms.singularCap
                        : !date
                          ? 'Fecha'
                          : availableTimeSlots.length === 0
                            ? 'Sin horas'
                            : 'Hora'
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {newBookingTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isSlotCreation && formData.barberId && date && availableTimeSlots.length === 0 && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Sin horas disponibles
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Edit-mode time controls: independent start & end pickers (5-min steps) */}
          {booking && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Inicio</Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => setFormData({ ...formData, time: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Hora de inicio" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {EDIT_TIME_SLOTS.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fin</Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Hora de fin" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {EDIT_TIME_SLOTS.map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
