import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  eachHourOfInterval,
  setHours,
  setMinutes,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Client, Service } from '@/types';
import { ApiBooking, ApiBookingStatus } from '@/types/api';
import { supabaseClientsApi } from '@/services/supabaseClients';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBookingsApi } from '@/services/supabaseBookings';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCalendarDragDrop } from '@/hooks/useCalendarDragDrop';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { cn } from '@/lib/utils';
import BookingModal from '@/components/bookings/BookingModal';
import { BookingDetailModal, BookingStatus, MonthView } from '@/components/calendar';
import { ServiceLegend } from '@/components/calendar/ServiceLegend';
import {
  BookingCard,
  DroppableTimeSlot,
  getServicePastelColor,
  getOverlapInfo,
  getBookingPosition,
} from '@/components/calendar/shared';

type ViewMode = 'day' | 'week' | 'month';

const HOUR_HEIGHT_DAY = 80;
const HOUR_HEIGHT_WEEK = 60;
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

export default function Calendar() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(() => isMobile ? 'day' : 'week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  // Set view mode based on screen size
  useEffect(() => {
    if (isMobile && viewMode === 'week') {
      setViewMode('day');
    }
  }, [isMobile, viewMode]);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        supabaseBookingsApi.getAll(),
        supabaseClientsApi.getAll(),
        supabaseServicesApi.getAll(),
      ]);
      setBookings(bookingsData);
      setClients(clientsData);
      setServices(servicesData);
      console.log('✅ Calendar data loaded from Supabase');
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drag and drop setup
  const {
    activeId,
    handleDragStart,
    handleDragEnd,
  } = useCalendarDragDrop({
    bookings,
    onBookingUpdate: (id, updated) => {
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
    },
    onBookingsChange: setBookings,
  });

  // Configure sensors for drag-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Get active booking for drag overlay
  const activeBooking = useMemo(() => {
    if (!activeId) return null;
    return bookings.find(b => b.id === activeId) || null;
  }, [activeId, bookings]);

  // Swipe gesture for mobile navigation
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => navigateDate('next'),
    onSwipeRight: () => navigateDate('prev'),
  });

  // Extract unique barbers
  const barbers = useMemo(() => {
    const barberSet = new Set<string>();
    bookings.forEach((b) => {
      if (b.barber) barberSet.add(b.barber);
    });
    return Array.from(barberSet).sort();
  }, [bookings]);

  // Filter bookings by barber and exclude cancelled
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'cancelled')
      .filter((b) => !selectedBarber || b.barber === selectedBarber);
  }, [bookings, selectedBarber]);

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        setCurrentDate((d) => (direction === 'next' ? addDays(d, 1) : subDays(d, 1)));
        break;
      case 'week':
        setCurrentDate((d) => (direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1)));
        break;
      case 'month':
        setCurrentDate((d) => (direction === 'next' ? addMonths(d, 1) : subMonths(d, 1)));
        break;
    }
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const hours = useMemo(() => {
    const start = setMinutes(setHours(new Date(), 8), 0);
    const end = setMinutes(setHours(new Date(), 20), 0);
    return eachHourOfInterval({ start, end });
  }, []);

  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredBookings
      .filter((b) => b.booking_date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    const previousBookings = [...bookings];
    const previousSelected = selectedBooking;
    
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: status as ApiBookingStatus, updated_at: new Date().toISOString() }
          : b
      )
    );
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking((prev) =>
        prev ? { ...prev, status: status as ApiBookingStatus, updated_at: new Date().toISOString() } : null
      );
    }
    
    try {
      await supabaseBookingsApi.updateStatus(bookingId, status as ApiBookingStatus);
      const statusLabels: Record<BookingStatus, string> = {
        pending: 'pendiente',
        confirmed: 'confirmada',
        completed: 'completada',
        cancelled: 'cancelada',
        no_show: 'no presentado',
      };
      toast({ title: `Cita marcada como ${statusLabels[status]}` });
    } catch (error) {
      setBookings(previousBookings);
      setSelectedBooking(previousSelected);
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const previousBookings = [...bookings];
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    setIsDetailOpen(false);
    setSelectedBooking(null);
    
    try {
      await supabaseBookingsApi.delete(bookingId);
      toast({ title: 'Cita eliminada correctamente' });
    } catch (error) {
      setBookings(previousBookings);
      toast({ title: 'Error al eliminar la cita', variant: 'destructive' });
    }
  };

  const handleEditBooking = (booking: ApiBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const openNewBooking = (date?: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const openBookingDetail = (booking: ApiBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  // Render Day View
  const renderDayView = () => {
    const dayBookings = getBookingsForDay(currentDate);
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    return (
      <div className="flex flex-1 overflow-hidden" {...(isMobile ? swipeHandlers : {})}>
        <div className="flex-1 flex overflow-auto">
          {/* Time column */}
          <div className="w-16 md:w-20 shrink-0 border-r border-border">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-20 border-b border-border px-2 text-xs md:text-sm text-muted-foreground flex items-start pt-1"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day content */}
          <div className="flex-1 relative min-w-[200px]">
            {HOURS.map((hour) => (
              <DroppableTimeSlot
                key={hour}
                id={`day-${dateStr}-${hour}`}
                hour={hour}
                date={dateStr}
                className="h-20 hover:bg-muted/30 cursor-pointer"
              >
                <div 
                  className="absolute inset-0"
                  onClick={() => openNewBooking(currentDate)} 
                />
              </DroppableTimeSlot>
            ))}

            {/* Bookings overlay */}
            {dayBookings.map((booking) => {
              const style = getBookingPosition(booking, HOUR_HEIGHT_DAY);
              const overlapInfo = getOverlapInfo(dayBookings, booking);
              const colorClasses = getServicePastelColor(booking, services);
              
              // Side-by-side layout for overlapping bookings (same on mobile and desktop)
              const leftCalc = `calc(${(overlapInfo.index / overlapInfo.total) * 100}% + 4px)`;
              const widthCalc = `calc(${100 / overlapInfo.total}% - 8px)`;
              
              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  style={{ 
                    top: style.top, 
                    height: style.height,
                    left: leftCalc,
                    width: widthCalc,
                  }}
                  colorClasses={colorClasses}
                  overlapInfo={overlapInfo}
                  onClick={() => openBookingDetail(booking)}
                  isDraggable={true}
                  viewMode="day"
                  isMobile={isMobile}
                />
              );
            })}

            {/* Empty state */}
            {dayBookings.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">Sin citas</p>
                  <p className="text-sm">No hay reservas para este día</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* Time column */}
      <div className="w-14 md:w-16 shrink-0 border-r border-border">
        <div className="h-12 border-b border-border" />
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="h-[60px] border-b border-border px-1 md:px-2 text-[10px] md:text-xs text-muted-foreground flex items-start pt-1"
          >
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Days columns */}
      <div className="flex-1 flex overflow-x-auto">
        {weekDays.map((day) => {
          const dayBookings = getBookingsForDay(day);
          const isCurrentDay = isToday(day);
          const dateStr = format(day, 'yyyy-MM-dd');

          return (
            <div
              key={day.toString()}
              className={cn(
                'flex-1 min-w-[100px] md:min-w-[120px] border-r border-border last:border-r-0',
                isCurrentDay && 'bg-primary/5'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'h-12 border-b border-border px-1 md:px-2 py-1 text-center cursor-pointer hover:bg-muted/50 transition-colors',
                  isCurrentDay && 'bg-primary/10'
                )}
                onClick={() => openNewBooking(day)}
              >
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <p className={cn('text-base md:text-lg font-semibold', isCurrentDay && 'text-primary')}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Hours grid */}
              <div className="relative">
                {HOURS.map((hour) => (
                  <DroppableTimeSlot
                    key={hour}
                    id={`week-${dateStr}-${hour}`}
                    hour={hour}
                    date={dateStr}
                    className="h-[60px] hover:bg-muted/30 cursor-pointer"
                  >
                    <div 
                      className="absolute inset-0"
                      onClick={() => openNewBooking(day)}
                    />
                  </DroppableTimeSlot>
                ))}

                {/* Bookings overlay */}
                {dayBookings.map((booking) => {
                  const style = getBookingPosition(booking, HOUR_HEIGHT_WEEK);
                  const overlapInfo = getOverlapInfo(dayBookings, booking);
                  const colorClasses = getServicePastelColor(booking, services);
                  
                  const leftCalc = `calc(${(overlapInfo.index / overlapInfo.total) * 100}% + 2px)`;
                  const widthCalc = `calc(${100 / overlapInfo.total}% - 4px)`;
                  
                  return (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      style={{ 
                        top: style.top, 
                        height: style.height,
                        left: leftCalc,
                        width: widthCalc,
                      }}
                      colorClasses={colorClasses}
                      overlapInfo={overlapInfo}
                      onClick={() => openBookingDetail(booking)}
                      isDraggable={true}
                      viewMode="week"
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Month View
  const renderMonthView = () => (
    <div className="flex flex-1 overflow-hidden" {...(isMobile ? swipeHandlers : {})}>
      <div className="flex-1 h-full">
        <MonthView
          currentDate={currentDate}
          bookings={filteredBookings}
          services={services}
          onDateClick={(date) => {
            setCurrentDate(date);
            setViewMode('day');
          }}
          onBookingClick={(booking) => openBookingDetail(booking)}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="h-9 w-9 min-w-[44px] min-h-[44px]">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="hidden sm:flex">
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="h-9 w-9 min-w-[44px] min-h-[44px]">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-base md:text-lg font-semibold capitalize truncate">
              {viewMode === 'day' && format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
              {viewMode === 'week' &&
                `${format(weekDays[0], 'd MMM', { locale: es })} - ${format(weekDays[6], 'd MMM', { locale: es })}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Barber Filter */}
            {barbers.length > 0 && (
              <Select
                value={selectedBarber || 'all'}
                onValueChange={(v) => setSelectedBarber(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[130px] md:w-[160px] h-9 min-h-[44px]">
                  <Filter className="h-4 w-4 mr-1 md:mr-2 shrink-0" />
                  <SelectValue placeholder="Barbero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber} value={barber}>
                      {barber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* View Switcher */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="day" className="text-xs md:text-sm px-2 md:px-3 min-h-[44px] min-w-[44px]">
                  <List className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Día</span>
                </TabsTrigger>
                {!isMobile && (
                  <TabsTrigger value="week" className="text-xs md:text-sm px-2 md:px-3">
                    <LayoutGrid className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Semana</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="month" className="text-xs md:text-sm px-2 md:px-3 min-h-[44px] min-w-[44px]">
                  <CalendarIcon className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Mes</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Refresh Button */}
            <Button variant="outline" size="icon" onClick={loadData} className="h-9 w-9 min-w-[44px] min-h-[44px]">
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* New Booking Button */}
            <Button onClick={() => openNewBooking()} size="sm" className="h-9 min-h-[44px]">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Nueva Cita</span>
            </Button>
          </div>
        </div>

        {/* Mobile Floating Button */}
        <Button
          size="icon"
          className="fixed bottom-20 right-4 md:hidden z-50 h-14 w-14 rounded-full shadow-lg min-w-[56px] min-h-[56px]"
          onClick={() => openNewBooking()}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Calendar Content */}
        <Card className="flex-1 m-2 md:m-4 mt-0 overflow-hidden border-border flex flex-col">
          <div className="flex-1 overflow-auto">
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>
          
          {/* Service Legend - always visible below calendar */}
          <ServiceLegend services={services} />
        </Card>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeBooking && (
            <div className="bg-card rounded-lg shadow-xl p-3 border-l-4 border-primary opacity-90">
              <p className="font-bold text-sm">{activeBooking.start_time.substring(0, 5)} - {activeBooking.end_time.substring(0, 5)}</p>
              <p className="font-semibold">{activeBooking.client_name}</p>
              <p className="text-sm text-muted-foreground">{activeBooking.service_name}</p>
            </div>
          )}
        </DragOverlay>

        {/* Booking Detail Modal */}
        <BookingDetailModal
          booking={selectedBooking}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedBooking(null);
          }}
          onStatusChange={handleStatusChange}
          onEdit={handleEditBooking}
          onDelete={handleDeleteBooking}
        />

        {/* Booking Modal for new/edit bookings */}
        <BookingModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedBooking(null);
            }
          }}
          booking={selectedBooking ? {
            id: selectedBooking.id,
            clientId: selectedBooking.client_id,
            clientName: selectedBooking.client_name,
            clientPhone: selectedBooking.client_phone,
            clientEmail: selectedBooking.client_email || '',
            serviceId: selectedBooking.service_id,
            serviceName: selectedBooking.service_name,
            serviceDuration: selectedBooking.service_duration,
            servicePrice: selectedBooking.service_price,
            date: selectedBooking.booking_date,
            time: selectedBooking.start_time.substring(0, 5),
            status: selectedBooking.status.replace('_', '-') as any,
            source: selectedBooking.source.replace('_', '-') as any,
            notes: selectedBooking.notes || '',
            createdAt: selectedBooking.created_at,
          } : null}
          clients={clients}
          services={services}
          onSave={async (data) => {
            try {
              const selectedService = services.find(s => s.id === data.serviceId);
              const duration = selectedService?.duration || data.serviceDuration || 30;
              
              const [hours, minutes] = (data.time || '09:00').split(':').map(Number);
              const endHours = hours + Math.floor((minutes + duration) / 60);
              const endMinutes = (minutes + duration) % 60;
              const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
              
              if (selectedBooking) {
                const updatedBooking = await supabaseBookingsApi.update(selectedBooking.id, {
                  booking_date: data.date,
                  start_time: `${data.time}:00`,
                  end_time: endTime,
                  status: (data.status?.replace('-', '_') || 'confirmed') as any,
                  notes: data.notes || null,
                });
                
                setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updatedBooking : b));
                toast({ title: 'Cita actualizada correctamente' });
              } else {
                const newBooking = await supabaseBookingsApi.create({
                  client_id: data.clientId || '',
                  service_id: data.serviceId || '',
                  booking_date: data.date || '',
                  start_time: `${data.time}:00`,
                  end_time: endTime,
                  status: 'confirmed',
                  source: ((data.source || 'phone').replace('-', '_')) as 'online' | 'phone' | 'walk_in',
                  client_name: data.clientName || '',
                  client_phone: data.clientPhone || '',
                  client_email: data.clientEmail || null,
                  service_name: data.serviceName || '',
                  service_duration: duration,
                  service_price: data.servicePrice || 0,
                  notes: data.notes || null,
                });
                
                setBookings(prev => [...prev, newBooking]);
                toast({ title: 'Cita creada correctamente' });
              }
              
              setIsModalOpen(false);
              setSelectedBooking(null);
            } catch (error) {
              console.error('Error saving booking:', error);
              toast({ title: 'Error al guardar la cita', variant: 'destructive' });
            }
          }}
          selectedDate={selectedDate}
        />
      </div>
    </DndContext>
  );
}
