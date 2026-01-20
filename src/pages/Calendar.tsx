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
  Clock,
  Scissors,
  User,
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
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import BookingModal from '@/components/bookings/BookingModal';
import { BookingDetailModal, StatusBadge, StatusDot, BookingStatus } from '@/components/calendar';
import { ServiceLegend } from '@/components/calendar/ServiceLegend';

type ViewMode = 'day' | 'week' | 'month';

// Predefined pastel colors for services (fallback when service has no color)
const pastelColors = [
  { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
  { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
  { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
  { bg: 'bg-rose-200', hover: 'hover:bg-rose-300', text: 'text-rose-900' },
  { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
  { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
  { bg: 'bg-cyan-200', hover: 'hover:bg-cyan-300', text: 'text-cyan-900' },
  { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
];

// Map service colors to pastel classes
const serviceColorMap: Record<string, { bg: string; hover: string; text: string }> = {
  '#3b82f6': { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
  '#10b981': { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
  '#f59e0b': { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
  '#ef4444': { bg: 'bg-red-200', hover: 'hover:bg-red-300', text: 'text-red-900' },
  '#8b5cf6': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
  '#ec4899': { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
  '#06b6d4': { bg: 'bg-cyan-200', hover: 'hover:bg-cyan-300', text: 'text-cyan-900' },
  '#84cc16': { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
  '#6366f1': { bg: 'bg-indigo-200', hover: 'hover:bg-indigo-300', text: 'text-indigo-900' },
  '#14b8a6': { bg: 'bg-teal-200', hover: 'hover:bg-teal-300', text: 'text-teal-900' },
  '#f97316': { bg: 'bg-orange-200', hover: 'hover:bg-orange-300', text: 'text-orange-900' },
};

// Get pastel color classes for a booking based on its service
const getServicePastelColor = (booking: ApiBooking, services: Service[]) => {
  const service = services.find(s => s.id === booking.service_id || s.name === booking.service_name);
  if (service?.color && serviceColorMap[service.color]) {
    return serviceColorMap[service.color];
  }
  // Fallback: use hash of service name to pick a consistent color
  const hash = (booking.service_name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

export default function Calendar() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
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

  // Check if two bookings overlap
  const doBookingsOverlap = (a: ApiBooking, b: ApiBooking) => {
    const aStart = parse(a.start_time, 'HH:mm:ss', new Date());
    const aEnd = parse(a.end_time, 'HH:mm:ss', new Date());
    const bStart = parse(b.start_time, 'HH:mm:ss', new Date());
    const bEnd = parse(b.end_time, 'HH:mm:ss', new Date());
    return aStart < bEnd && aEnd > bStart;
  };

  // Calculate horizontal position for overlapping bookings
  const getOverlapInfo = (bookings: ApiBooking[], booking: ApiBooking) => {
    // Find all bookings that overlap with the current one
    const overlapping = bookings.filter(b => doBookingsOverlap(booking, b));
    // Sort overlapping bookings by start time, then by id for consistency
    overlapping.sort((a, b) => {
      const timeComp = a.start_time.localeCompare(b.start_time);
      return timeComp !== 0 ? timeComp : a.id.localeCompare(b.id);
    });
    const index = overlapping.findIndex(b => b.id === booking.id);
    return { total: overlapping.length, index };
  };

  const getBookingPosition = (booking: ApiBooking, hourHeight: number = 64) => {
    const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
    const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);
    const top = ((startHour - 8) * hourHeight) + ((startMinute / 60) * hourHeight);
    const height = Math.max((duration / 60) * hourHeight, 32);
    return { top, height };
  };

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    // Optimistic update
    const previousBookings = [...bookings];
    const previousSelected = selectedBooking;
    const bookingToUpdate = bookings.find(b => b.id === bookingId);
    
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
      
      // Add notification for cancelled bookings
      if (status === 'cancelled' && bookingToUpdate) {
        addNotification({
          type: 'booking_cancelled',
          title: 'Cita cancelada',
          message: `${bookingToUpdate.client_name || 'Cliente'} - ${bookingToUpdate.service_name || 'Servicio'}`,
          data: {
            bookingId,
            clientName: bookingToUpdate.client_name,
            serviceName: bookingToUpdate.service_name,
          },
        });
      }
    } catch (error) {
      // Rollback on error
      setBookings(previousBookings);
      setSelectedBooking(previousSelected);
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    // Optimistic update
    const previousBookings = [...bookings];
    const bookingToDelete = bookings.find(b => b.id === bookingId);
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    setIsDetailOpen(false);
    setSelectedBooking(null);
    
    try {
      await supabaseBookingsApi.delete(bookingId);
      toast({ title: 'Cita eliminada correctamente' });
      
      // Add notification for deleted booking
      if (bookingToDelete) {
        addNotification({
          type: 'booking_cancelled',
          title: 'Cita eliminada',
          message: `${bookingToDelete.client_name || 'Cliente'} - ${bookingToDelete.service_name || 'Servicio'}`,
          data: {
            bookingId,
            clientName: bookingToDelete.client_name,
            serviceName: bookingToDelete.service_name,
          },
        });
      }
    } catch (error) {
      // Rollback on error
      setBookings(previousBookings);
      toast({ title: 'Error al eliminar la cita', variant: 'destructive' });
    }
  };

  const handleEditBooking = (booking: ApiBooking) => {
    // Open the booking modal with the booking data for editing
    setSelectedBooking(booking);
    setIsDetailOpen(false);
    setIsModalOpen(true);
    toast({ title: 'Modo edición', description: 'Edita los detalles de la cita' });
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
                      const { top, height } = getBookingPosition(booking, 64);
                      const { total, index } = getOverlapInfo(dayBookings, booking);
                      const colorClasses = getServicePastelColor(booking, services);
                      
                      // Calculate width and left position based on overlaps
                      const widthPercent = 100 / total;
                      const leftPercent = index * widthPercent;
                      
                      // Adaptive styling based on card height and overlap count
                      const getCardStyles = () => {
                        // For very short cards (15-20min services), prioritize time visibility
                        if (height < 25) {
                          return { 
                            time: 'text-[9px]', barber: 'text-[8px]', client: 'text-[8px]',
                            icon: 'w-2.5 h-2.5', clientIcon: 'w-2.5 h-2.5',
                            padding: 'px-1 py-0.5', showBarber: false, showClient: false,
                            showTimeRange: false
                          };
                        }
                        if (height < 35) {
                          return { 
                            time: 'text-[9px]', barber: 'text-[8px]', client: 'text-[9px]',
                            icon: 'w-2.5 h-2.5', clientIcon: 'w-2.5 h-2.5',
                            padding: 'px-1.5 py-0.5', showBarber: false, showClient: true,
                            showTimeRange: false
                          };
                        }
                        if (total >= 4) return { 
                          time: 'text-[9px]', barber: 'text-[8px]', client: 'text-[10px]',
                          icon: 'w-2.5 h-2.5', clientIcon: 'w-2.5 h-2.5',
                          padding: 'px-1.5 py-1', showBarber: false, showClient: true,
                          showTimeRange: false
                        };
                        if (total === 3) return { 
                          time: 'text-[10px]', barber: 'text-[9px]', client: 'text-[11px]',
                          icon: 'w-2.5 h-2.5', clientIcon: 'w-3 h-3',
                          padding: 'px-1.5 py-1', showBarber: height > 45, showClient: true,
                          showTimeRange: true
                        };
                        if (total === 2) return { 
                          time: 'text-[11px]', barber: 'text-[10px]', client: 'text-xs',
                          icon: 'w-3 h-3', clientIcon: 'w-3 h-3',
                          padding: 'px-1.5 py-1', showBarber: height > 40, showClient: true,
                          showTimeRange: true
                        };
                        return { 
                          time: 'text-xs', barber: 'text-[11px]', client: 'text-sm',
                          icon: 'w-3 h-3', clientIcon: 'w-3.5 h-3.5',
                          padding: 'px-2 py-1', showBarber: height >= 45, showClient: true,
                          showTimeRange: true
                        };
                      };
                      const styles = getCardStyles();
                      
                      const timeDisplay = styles.showTimeRange 
                        ? `${booking.start_time.substring(0, 5)}-${booking.end_time.substring(0, 5)}`
                        : booking.start_time.substring(0, 5);
                      const barberFirstName = booking.barber?.split(' ')[0] || '';
                      
                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            'absolute rounded-md cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-center',
                            'hover:shadow-md hover:brightness-95',
                            styles.padding,
                            colorClasses.bg,
                            colorClasses.text
                          )}
                          style={{ 
                            top, 
                            height,
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openBookingDetail(booking);
                          }}
                        >
                          {/* Row 1: Time (left) + Barber (right) */}
                          <div className="flex justify-between items-center gap-1">
                            <div className={cn("flex items-center gap-1 font-semibold shrink-0", styles.time)}>
                              <Clock className={cn(styles.icon, "shrink-0")} />
                              <span className="leading-tight">{timeDisplay}</span>
                            </div>
                            {styles.showBarber && barberFirstName && (
                              <div className={cn("flex items-center gap-0.5 font-medium truncate", styles.barber)}>
                                <Scissors className={cn(styles.icon, "shrink-0")} />
                                <span className="truncate leading-tight">{barberFirstName}</span>
                              </div>
                            )}
                          </div>
                          {/* Row 2: Client Name */}
                          {styles.showClient && (
                            <div className={cn("flex items-center gap-1 mt-0.5", styles.client)}>
                              <User className={cn(styles.clientIcon, "shrink-0")} />
                              <span className="font-semibold truncate leading-tight">{booking.client_name}</span>
                            </div>
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
              const { top, height } = getBookingPosition(booking, 80);
              const { total, index } = getOverlapInfo(dayBookings, booking);

              const colorClasses = getServicePastelColor(booking, services);
              
              // Calculate width and left position based on overlaps
              const widthPercent = 100 / total;
              const leftPercent = index * widthPercent;
              
              // Adaptive text sizing based on overlap count and height
              const getTextSizes = () => {
                // Height-based adjustments first
                if (height < 40) {
                  return { 
                    header: 'text-[10px]', name: 'text-[11px]', detail: 'text-[9px]', 
                    gap: 'gap-1', padding: 'px-2 py-1',
                    showStatus: false, showDetails: false, showBarber: true
                  };
                }
                if (height < 60) {
                  return { 
                    header: 'text-[11px]', name: 'text-xs', detail: 'text-[10px]', 
                    gap: 'gap-1', padding: 'px-2 py-1.5',
                    showStatus: false, showDetails: false, showBarber: true
                  };
                }
                // Then overlap-based adjustments
                if (total >= 4) return { 
                  header: 'text-[10px]', name: 'text-[11px]', detail: 'text-[9px]', 
                  gap: 'gap-1', padding: 'px-2 py-1.5',
                  showStatus: false, showDetails: false, showBarber: true
                };
                if (total === 3) return { 
                  header: 'text-[11px]', name: 'text-xs', detail: 'text-[10px]', 
                  gap: 'gap-1', padding: 'px-2 py-1.5',
                  showStatus: height > 70, showDetails: height > 80, showBarber: true
                };
                if (total === 2) return { 
                  header: 'text-xs', name: 'text-sm', detail: 'text-[11px]', 
                  gap: 'gap-1.5', padding: 'px-2.5 py-2',
                  showStatus: height > 60, showDetails: height > 70, showBarber: true
                };
                return { 
                  header: 'text-sm', name: 'text-base', detail: 'text-xs', 
                  gap: 'gap-2', padding: 'px-3 py-2',
                  showStatus: true, showDetails: height > 70, showBarber: true
                };
              };
              const sizes = getTextSizes();
              
              // Show shortened time format for very narrow cards
              const showFullTime = total <= 2 && height >= 40;
              const timeDisplay = showFullTime 
                ? `${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)}`
                : booking.start_time.substring(0, 5);
              
              // Get barber first name
              const barberFirstName = booking.barber?.split(' ')[0] || '';
              
              return (
                <div
                  key={booking.id}
                  className={cn(
                    'absolute rounded-md border-l-4 cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-center',
                    'hover:shadow-md hover:brightness-95',
                    sizes.padding,
                    colorClasses.bg,
                    colorClasses.text
                  )}
                  style={{ 
                    top, 
                    height,
                    left: `calc(${leftPercent}% + 8px)`,
                    width: `calc(${widthPercent}% - 16px)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openBookingDetail(booking);
                  }}
                >
                  {/* Row 1: Time (left) + Barber (right) */}
                  <div className="flex justify-between items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("flex items-center gap-1 font-semibold", sizes.header)}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timeDisplay}</span>
                      </div>
                      {sizes.showStatus && <StatusBadge status={booking.status as BookingStatus} size="sm" />}
                    </div>
                    {sizes.showBarber && barberFirstName && (
                      <div className={cn("flex items-center gap-1 font-medium", sizes.header)}>
                        <Scissors className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">{barberFirstName}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Row 2: Client Name */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                    <span className={cn("font-semibold truncate", sizes.name)}>{booking.client_name}</span>
                  </div>
                  
                  {/* Row 3: Extra details for larger cards */}
                  {sizes.showDetails && (
                    <div className={cn("flex items-center gap-3 mt-1 flex-wrap", sizes.detail)}>
                      <span className="font-medium opacity-80">{booking.service_name}</span>
                      <span className="font-semibold">€{booking.service_price}</span>
                    </div>
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
                        {dayBookings.slice(0, 3).map((booking) => {
                          const colorClasses = getServicePastelColor(booking, services);
                          const barberFirstName = booking.barber?.split(' ')[0] || '';
                          return (
                            <div
                              key={booking.id}
                              className={cn(
                                'px-1.5 py-1 rounded-md cursor-pointer transition-all duration-200',
                                'hover:shadow-md hover:brightness-95',
                                colorClasses.bg,
                                colorClasses.text
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                openBookingDetail(booking);
                              }}
                            >
                              {/* Row 1: Time (left) + Barber (right) */}
                              <div className="flex justify-between items-center gap-1">
                                <div className="flex items-center gap-1 text-[11px] font-semibold">
                                  <Clock className="w-3 h-3" />
                                  <span>{booking.start_time.substring(0, 5)}</span>
                                </div>
                                {barberFirstName && (
                                  <div className="flex items-center gap-0.5 text-[10px] font-medium truncate">
                                    <Scissors className="w-2.5 h-2.5" />
                                    <span className="truncate">{barberFirstName}</span>
                                  </div>
                                )}
                              </div>
                              {/* Row 2: Client name */}
                              <div className="flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" />
                                <span className="text-[11px] font-semibold truncate">{booking.client_name}</span>
                              </div>
                            </div>
                          );
                        })}
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
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-border bg-card">
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
        
        {/* Service Legend - always visible below calendar */}
        <ServiceLegend services={services} />
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
            // Calculate end time based on service duration
            const selectedService = services.find(s => s.id === data.serviceId);
            const duration = selectedService?.duration || data.serviceDuration || 30;
            
            // Parse start time and calculate end time
            const [hours, minutes] = (data.time || '09:00').split(':').map(Number);
            const endHours = hours + Math.floor((minutes + duration) / 60);
            const endMinutes = (minutes + duration) % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
            
            if (selectedBooking) {
              // Update existing booking
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
              // Create new booking
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
  );
}
