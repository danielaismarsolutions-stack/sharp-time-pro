import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachHourOfInterval,
  setHours,
  setMinutes,
  isToday,
  parse,
  differenceInMinutes,
} from 'date-fns';
import { es } from 'date-fns/locale';
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
  AlertCircle,
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
import { ApiBooking } from '@/types/api';
import { clientsApi, servicesApi } from '@/services/api';
import { apiClient } from '@/services/apiClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import BookingModal from '@/components/bookings/BookingModal';
import { BookingDetailModal, StatusBadge, StatusDot, BookingStatus } from '@/components/calendar';

type ViewMode = 'day' | 'week' | 'month';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  confirmed: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  completed: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  cancelled: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
  no_show: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  'no-show': 'bg-purple-500/20 border-purple-500/50 text-purple-400',
};

export default function Calendar() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
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

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        apiClient.bookings.getAll(),
        clientsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setBookings(bookingsData);
      setClients(clientsData);
      setServices(servicesData);
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

  // Extract unique barbers
  const barbers = useMemo(() => {
    const barberSet = new Set<string>();
    bookings.forEach((b) => {
      if (b.barber) barberSet.add(b.barber);
    });
    return Array.from(barberSet).sort();
  }, [bookings]);

  // Filter bookings by barber
  const filteredBookings = useMemo(() => {
    if (!selectedBarber) return bookings;
    return bookings.filter((b) => b.barber === selectedBarber);
  }, [bookings, selectedBarber]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const modifier = direction === 'next' ? 1 : -1;
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

  const getBookingPosition = (booking: ApiBooking) => {
    const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
    const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);
    const top = ((startHour - 8) * 64) + ((startMinute / 60) * 64);
    const height = Math.max((duration / 60) * 64, 32);
    return { top, height };
  };

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      await apiClient.bookings.update(bookingId, { status });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status, updated_at: new Date().toISOString() }
            : b
        )
      );
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) =>
          prev ? { ...prev, status, updated_at: new Date().toISOString() } : null
        );
      }
      const statusLabels: Record<BookingStatus, string> = {
        pending: 'pendiente',
        confirmed: 'confirmada',
        completed: 'completada',
        cancelled: 'cancelada',
        no_show: 'no presentado',
      };
      toast({ title: `Cita marcada como ${statusLabels[status]}` });
    } catch (error) {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await apiClient.bookings.delete(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setIsDetailOpen(false);
      setSelectedBooking(null);
      toast({ title: 'Cita eliminada' });
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleEditBooking = (booking: ApiBooking) => {
    toast({ title: 'Próximamente', description: 'Edición de citas disponible pronto' });
  };

  const openNewBooking = (date?: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const openBookingDetail = (booking: ApiBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const renderWeekView = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* Time column */}
      <div className="w-14 md:w-16 shrink-0 border-r border-border">
        <div className="h-12 border-b border-border" />
        {hours.map((hour) => (
          <div
            key={hour.toString()}
            className="h-16 border-b border-border px-1 md:px-2 text-[10px] md:text-xs text-muted-foreground flex items-start pt-1"
          >
            {format(hour, 'HH:mm')}
          </div>
        ))}
      </div>

      {/* Days columns */}
      <div className="flex-1 flex overflow-x-auto">
        {weekDays.map((day) => {
          const dayBookings = getBookingsForDay(day);
          const isCurrentDay = isToday(day);

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
                <p
                  className={cn(
                    'text-base md:text-lg font-semibold',
                    isCurrentDay && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </p>
              </div>

              {/* Hours grid */}
              <div className="relative">
                {hours.map((hour) => (
                  <div
                    key={hour.toString()}
                    className="h-16 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openNewBooking(day)}
                  />
                ))}

                {/* Bookings overlay */}
                {dayBookings.map((booking) => {
                  const { top, height } = getBookingPosition(booking);
                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        'absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded-md border px-1 md:px-2 py-0.5 md:py-1 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 overflow-hidden',
                        statusColors[booking.status]
                      )}
                      style={{ top, height }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openBookingDetail(booking);
                      }}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <StatusDot status={booking.status as BookingStatus} size="sm" />
                        <span className="text-[10px] font-medium">
                          {booking.start_time.substring(0, 5)}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs font-medium truncate">{booking.client_name}</p>
                      {height > 40 && (
                        <p className="text-[9px] md:text-xs opacity-75 truncate">{booking.service_name}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayBookings = getBookingsForDay(currentDate);

    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex">
          {/* Time column */}
          <div className="w-16 md:w-20 shrink-0 border-r border-border">
            {hours.map((hour) => (
              <div
                key={hour.toString()}
                className="h-20 border-b border-border px-2 text-xs md:text-sm text-muted-foreground flex items-start pt-1"
              >
                {format(hour, 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day content */}
          <div className="flex-1 relative">
            {hours.map((hour) => (
              <div
                key={hour.toString()}
                className="h-20 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors relative"
                onClick={() => openNewBooking(currentDate)}
              >
                {/* 30-minute line */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/30" />
              </div>
            ))}

            {/* Bookings overlay */}
            {dayBookings.map((booking) => {
              const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
              const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());
              const startHour = startTime.getHours();
              const startMinute = startTime.getMinutes();
              const duration = differenceInMinutes(endTime, startTime);
              const top = ((startHour - 8) * 80) + ((startMinute / 60) * 80);
              const height = Math.max((duration / 60) * 80, 60);

              return (
                <div
                  key={booking.id}
                  className={cn(
                    'absolute left-2 right-4 rounded-lg border-l-4 px-3 py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]',
                    statusColors[booking.status]
                  )}
                  style={{ top, height }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openBookingDetail(booking);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                      </span>
                      <StatusBadge status={booking.status as BookingStatus} size="sm" />
                    </div>
                    <span className="text-sm font-medium">€{booking.service_price}</span>
                  </div>
                  <p className="font-medium">{booking.client_name}</p>
                  {height > 60 && (
                    <>
                      <p className="text-sm opacity-75">{booking.service_name}</p>
                      {booking.barber && (
                        <p className="text-xs opacity-60 mt-1">Barbero: {booking.barber}</p>
                      )}
                    </>
                  )}
                </div>
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

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-border">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="p-2 text-center text-xs md:text-sm font-medium text-muted-foreground uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 border-b border-border last:border-b-0">
                {week.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={day.toString()}
                      className={cn(
                        'min-h-[80px] md:min-h-[100px] border-r border-border last:border-r-0 p-1 cursor-pointer hover:bg-muted/30 transition-colors',
                        !isCurrentMonth && 'bg-muted/10',
                        isCurrentDay && 'bg-primary/5'
                      )}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('day');
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs md:text-sm font-medium',
                            !isCurrentMonth && 'text-muted-foreground/50',
                            isCurrentDay && 'bg-primary text-primary-foreground'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={cn(
                              'text-[10px] md:text-xs px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-1',
                              'bg-secondary/50 hover:bg-secondary/80 transition-colors'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingDetail(booking);
                            }}
                          >
                            <StatusDot status={booking.status as BookingStatus} size="sm" />
                            <span className="font-medium">{booking.start_time.substring(0, 5)}</span>
                            <span className="truncate hidden sm:inline text-muted-foreground">
                              {booking.client_name}
                            </span>
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <p className="text-[10px] md:text-xs text-primary font-medium px-1">
                            +{dayBookings.length - 3} más
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="hidden sm:flex">
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="h-9 w-9">
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
              <SelectTrigger className="w-[130px] md:w-[160px] h-9">
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
              <TabsTrigger value="day" className="text-xs md:text-sm px-2 md:px-3">
                <List className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Día</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs md:text-sm px-2 md:px-3">
                <LayoutGrid className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Semana</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs md:text-sm px-2 md:px-3">
                <CalendarIcon className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Mes</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Refresh Button */}
          <Button variant="outline" size="icon" onClick={loadData} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* New Booking Button */}
          <Button onClick={() => openNewBooking()} size="sm" className="h-9">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Nueva Cita</span>
          </Button>
        </div>
      </div>

      {/* Mobile Floating Button */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 md:hidden z-50 h-14 w-14 rounded-full shadow-lg"
        onClick={() => openNewBooking()}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Calendar Content */}
      <Card className="flex-1 m-2 md:m-4 mt-0 overflow-hidden border-border">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Card>

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

      {/* Booking Modal for new bookings */}
      <BookingModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        booking={null}
        clients={clients}
        services={services}
        onSave={async (data) => {
          toast({ title: 'Próximamente', description: 'Creación de citas disponible pronto' });
          setIsModalOpen(false);
        }}
        selectedDate={selectedDate}
      />
    </div>
  );
}
