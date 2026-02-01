import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Check, ChevronsUpDown } from 'lucide-react';
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
import { Barber } from '@/types/barber';
import { useToast } from '@/hooks/use-toast';
import ClientModal from '@/components/clients/ClientModal';

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  clients: Client[];
  services: Service[];
  barbers: Barber[];
  onSave: (booking: Partial<Booking>) => Promise<void>;
  onClientCreate?: (client: Partial<Client>) => Promise<Client>;
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
  barbers,
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
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    barberId: '',
    time: '09:00',
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

  useEffect(() => {
    if (booking) {
      setDate(new Date(booking.date));
      setFormData({
        clientId: booking.clientId,
        serviceId: booking.serviceId,
        barberId: booking.barber || '',
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
        time: '09:00',
        status: 'confirmed',
        source: 'phone',
        notes: '',
      });
    }
  }, [booking, selectedDate, open]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const selectedBarber = barbers.find((b) => b.id === formData.barberId);

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
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {booking ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection with Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cliente</Label>
            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientSearchOpen}
                  className="w-full justify-between font-normal h-10"
                >
                  {selectedClient ? (
                    <span className="truncate">{selectedClient.name} - {selectedClient.phone}</span>
                  ) : (
                    <span className="text-muted-foreground">Buscar cliente...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por nombre, teléfono..."
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
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
                            <Plus className="mr-2 h-4 w-4" />
                            <span className="font-medium">Crear nuevo cliente</span>
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
                              'mr-2 h-4 w-4',
                              formData.clientId === client.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            <span className="text-xs text-muted-foreground">{client.phone}</span>
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Servicio</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
            >
              <SelectTrigger className="h-10">
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

          {/* Barber Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Barbero</Label>
            <Select
              value={formData.barberId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, barberId: value === 'none' ? '' : value })}
            >
              <SelectTrigger className="h-10">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {date ? format(date, "d 'de' MMM yyyy", { locale: es }) : 'Selecciona fecha'}
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Hora</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
              >
                <SelectTrigger className="h-10">
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
            <Label className="text-sm font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Solicitudes especiales o notas..."
              rows={2}
              className="resize-none"
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
