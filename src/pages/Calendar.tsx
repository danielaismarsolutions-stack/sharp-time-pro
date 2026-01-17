import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  addMinutes,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
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
  GripVertical,
  Clock,
  User,
  Scissors,
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

// Enhanced status gradients for beautiful booking cards
const statusGradients: Record<string, { bg: string; border: string; hover: string; glow: string }> = {
  pending: {
    bg: 'bg-gradient-to-br from-amber-500/30 via-amber-500/20 to-orange-600/10',
    border: 'border-l-4 border-l-amber-400 border-amber-500/30',
    hover: 'hover:from-amber-500/40 hover:via-amber-500/30 hover:to-orange-600/20',
    glow: 'hover:shadow-amber-500/25',
  },
  confirmed: {
    bg: 'bg-gradient-to-br from-blue-500/30 via-blue-500/20 to-cyan-600/10',
    border: 'border-l-4 border-l-blue-400 border-blue-500/30',
    hover: 'hover:from-blue-500/40 hover:via-blue-500/30 hover:to-cyan-600/20',
    glow: 'hover:shadow-blue-500/25',
  },
  completed: {
    bg: 'bg-gradient-to-br from-emerald-500/30 via-emerald-500/20 to-teal-600/10',
    border: 'border-l-4 border-l-emerald-400 border-emerald-500/30',
    hover: 'hover:from-emerald-500/40 hover:via-emerald-500/30 hover:to-teal-600/20',
    glow: 'hover:shadow-emerald-500/25',
  },
  cancelled: {
    bg: 'bg-gradient-to-br from-rose-500/30 via-rose-500/20 to-red-600/10',
    border: 'border-l-4 border-l-rose-400 border-rose-500/30',
    hover: 'hover:from-rose-500/40 hover:via-rose-500/30 hover:to-red-600/20',
    glow: 'hover:shadow-rose-500/25',
  },
  no_show: {
    bg: 'bg-gradient-to-br from-purple-500/30 via-purple-500/20 to-violet-600/10',
    border: 'border-l-4 border-l-purple-400 border-purple-500/30',
    hover: 'hover:from-purple-500/40 hover:via-purple-500/30 hover:to-violet-600/20',
    glow: 'hover:shadow-purple-500/25',
  },
  'no-show': {
    bg: 'bg-gradient-to-br from-purple-500/30 via-purple-500/20 to-violet-600/10',
    border: 'border-l-4 border-l-purple-400 border-purple-500/30',
    hover: 'hover:from-purple-500/40 hover:via-purple-500/30 hover:to-violet-600/20',
    glow: 'hover:shadow-purple-500/25',
  },
};

interface DragState {
  booking: ApiBooking | null;
  isDragging: boolean;
  offsetY: number;
  currentDate: Date | null;
  currentHour: number | null;
  currentMinute: number | null;
}

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

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    booking: null,
    isDragging: false,
    offsetY: 0,
    currentDate: null,
    currentHour: null,
    currentMinute: null,
  });
  const dayColumnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const getBookingsForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredBookings
      .filter((b) => b.booking_date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [filteredBookings]);

  const getBookingPosition = (booking: ApiBooking, hourHeight: number = 64) => {
    const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
    const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);
    const top = ((startHour - 8) * hourHeight) + ((startMinute / 60) * hourHeight);
    const height = Math.max((duration / 60) * hourHeight, 40);
    return { top, height };
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((booking: ApiBooking, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    setDragState({
      booking,
      isDragging: true,
      offsetY,
      currentDate: null,
      currentHour: null,
      currentMinute: null,
    });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.booking) return;

    // Find which day column we're over
    let targetDate: Date | null = null;
    let targetHour: number | null = null;
    let targetMinute: number | null = null;

    dayColumnRefs.current.forEach((ref, dateKey) => {
      const rect = ref.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        targetDate = parse(dateKey, 'yyyy-MM-dd', new Date());
        
        // Calculate hour from Y position (64px per hour in week view)
        const hourHeight = viewMode === 'day' ? 80 : 64;
        const relativeY = e.clientY - rect.top;
        const totalMinutes = (relativeY / hourHeight) * 60;
        targetHour = Math.floor(totalMinutes / 60) + 8;
        targetMinute = Math.round((totalMinutes % 60) / 15) * 15;
        
        // Clamp values
        if (targetHour < 8) { targetHour = 8; targetMinute = 0; }
        if (targetHour > 20) { targetHour = 20; targetMinute = 0; }
        if (targetMinute >= 60) { targetHour += 1; targetMinute = 0; }
      }
    });

    setDragState(prev => ({
      ...prev,
      currentDate: targetDate,
      currentHour: targetHour,
      currentMinute: targetMinute,
    }));
  }, [dragState.isDragging, dragState.booking, viewMode]);

  const handleDragEnd = useCallback(async () => {
    if (!dragState.booking || !dragState.currentDate || dragState.currentHour === null) {
      setDragState({
        booking: null,
        isDragging: false,
        offsetY: 0,
        currentDate: null,
        currentHour: null,
        currentMinute: null,
      });
      return;
    }

    const booking = dragState.booking;
    const newDate = format(dragState.currentDate, 'yyyy-MM-dd');
    const newStartTime = `${dragState.currentHour.toString().padStart(2, '0')}:${(dragState.currentMinute || 0).toString().padStart(2, '0')}:00`;

    // Calculate duration
    const originalStart = parse(booking.start_time, 'HH:mm:ss', new Date());
    const originalEnd = parse(booking.end_time, 'HH:mm:ss', new Date());
    const duration = differenceInMinutes(originalEnd, originalStart);

    const newStartDate = parse(newStartTime, 'HH:mm:ss', new Date());
    const newEndDate = addMinutes(newStartDate, duration);
    const newEndTime = format(newEndDate, 'HH:mm:ss');

    // Optimistic update
    const updatedBookings = bookings.map(b =>
      b.id === booking.id
        ? { ...b, booking_date: newDate, start_time: newStartTime, end_time: newEndTime }
        : b
    );
    setBookings(updatedBookings);

    setDragState({
      booking: null,
      isDragging: false,
      offsetY: 0,
      currentDate: null,
      currentHour: null,
      currentMinute: null,
    });

    try {
      await apiClient.bookings.update(booking.id, {
        booking_date: newDate,
        start_time: newStartTime,
      });
      toast({
        title: 'Cita reprogramada',
        description: `${booking.client_name} movida a ${format(dragState.currentDate, 'd MMM', { locale: es })} ${newStartTime.substring(0, 5)}`,
      });
    } catch (error) {
      // Revert on error
      setBookings(bookings);
      toast({ title: 'Error al reprogramar', variant: 'destructive' });
    }
  }, [dragState, bookings, toast]);

  // Mouse event listeners for drag
  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

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

  const setDayRef = useCallback((date: Date, el: HTMLDivElement | null) => {
    const key = format(date, 'yyyy-MM-dd');
    if (el) {
      dayColumnRefs.current.set(key, el);
    } else {
      dayColumnRefs.current.delete(key);
    }
  }, []);

  // Booking card component
  const BookingCard = ({ booking, variant = 'week' }: { booking: ApiBooking; variant?: 'week' | 'day' }) => {
    const style = statusGradients[booking.status] || statusGradients.pending;
    const isDragging = dragState.booking?.id === booking.id;
    const hourHeight = variant === 'day' ? 80 : 64;
    const { top, height } = getBookingPosition(booking, hourHeight);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: isDragging ? 0.7 : 1, 
          scale: isDragging ? 1.02 : 1,
          boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01, y: -1 }}
        className={cn(
          'absolute rounded-lg border backdrop-blur-sm overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200',
          style.bg,
          style.border,
          style.hover,
          style.glow,
          'hover:shadow-xl',
          variant === 'day' ? 'left-2 right-4' : 'left-0.5 right-0.5 md:left-1 md:right-1',
          isDragging && 'z-50 ring-2 ring-primary/50'
        )}
        style={{ top, height }}
        onMouseDown={(e) => handleDragStart(booking, e)}
        onClick={(e) => {
          if (!dragState.isDragging) {
            e.stopPropagation();
            openBookingDetail(booking);
          }
        }}
      >
        {variant === 'day' ? (
          // Day view - larger cards
          <div className="h-full p-3 flex flex-col">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StatusDot status={booking.status as BookingStatus} size="md" />
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold tabular-nums">{booking.start_time.substring(0, 5)}</span>
                  <span className="text-xs text-muted-foreground">- {booking.end_time.substring(0, 5)}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-primary">€{booking.service_price}</span>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold">{booking.client_name}</span>
              </div>
              {height > 70 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scissors className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{booking.service_name}</span>
                </div>
              )}
            </div>

            {height > 90 && booking.barber && (
              <div className="mt-1 pt-1 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Barbero: {booking.barber}</span>
              </div>
            )}
          </div>
        ) : (
          // Week view - compact cards
          <div className="h-full p-1.5 md:p-2 flex flex-col group">
            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
            
            <div className="flex items-center gap-1 mb-0.5">
              <StatusDot status={booking.status as BookingStatus} size="sm" />
              <span className="text-[10px] md:text-xs font-bold tabular-nums">
                {booking.start_time.substring(0, 5)}
              </span>
            </div>
            
            <p className="text-[10px] md:text-xs font-semibold truncate">{booking.client_name}</p>
            
            {height > 50 && (
              <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">
                {booking.service_name}
              </p>
            )}
            
            {height > 65 && (
              <p className="text-[9px] text-primary font-medium mt-auto">
                €{booking.service_price}
              </p>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Drop indicator component
  const DropIndicator = ({ date }: { date: Date }) => {
    if (!dragState.isDragging || !dragState.currentDate || !isSameDay(dragState.currentDate, date)) {
      return null;
    }

    const hourHeight = viewMode === 'day' ? 80 : 64;
    const top = ((dragState.currentHour || 8) - 8) * hourHeight + ((dragState.currentMinute || 0) / 60) * hourHeight;

    return (
      <motion.div
        initial={{ opacity: 0, scaleX: 0.5 }}
        animate={{ opacity: 1, scaleX: 1 }}
        className="absolute left-1 right-1 h-1 rounded-full bg-primary z-40 shadow-lg shadow-primary/50"
        style={{ top }}
      >
        <span className="absolute -top-4 left-0 text-[10px] font-bold text-primary bg-card/90 px-1 rounded">
          {(dragState.currentHour || 8).toString().padStart(2, '0')}:{(dragState.currentMinute || 0).toString().padStart(2, '0')}
        </span>
      </motion.div>
    );
  };

  const renderWeekView = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* Time column */}
      <div className="w-14 md:w-16 shrink-0 border-r border-border/50 bg-card/50">
        <div className="h-12 border-b border-border/50" />
        {hours.map((hour) => (
          <div
            key={hour.toString()}
            className="h-16 border-b border-border/30 px-1 md:px-2 text-[10px] md:text-xs text-muted-foreground flex items-start pt-1 font-medium"
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
                'flex-1 min-w-[100px] md:min-w-[130px] border-r border-border/30 last:border-r-0',
                isCurrentDay && 'bg-primary/5'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'h-12 border-b border-border/50 px-1 md:px-2 py-1 text-center cursor-pointer hover:bg-accent/50 transition-colors',
                  isCurrentDay && 'bg-primary/10'
                )}
                onClick={() => openNewBooking(day)}
              >
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-medium tracking-wide">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <p
                  className={cn(
                    'text-base md:text-lg font-bold',
                    isCurrentDay && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </p>
              </div>

              {/* Hours grid with bookings */}
              <div 
                className="relative"
                ref={(el) => setDayRef(day, el)}
              >
                {hours.map((hour, idx) => (
                  <div
                    key={hour.toString()}
                    className={cn(
                      'h-16 border-b border-border/20 hover:bg-accent/30 cursor-pointer transition-colors relative',
                      idx % 2 === 0 && 'bg-muted/5'
                    )}
                    onClick={() => openNewBooking(day)}
                  >
                    {/* 30-minute line */}
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/15" />
                  </div>
                ))}

                {/* Drop indicator */}
                <DropIndicator date={day} />

                {/* Bookings overlay */}
                <AnimatePresence>
                  {dayBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} variant="week" />
                  ))}
                </AnimatePresence>
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
          <div className="w-16 md:w-20 shrink-0 border-r border-border/50 bg-card/50">
            {hours.map((hour) => (
              <div
                key={hour.toString()}
                className="h-20 border-b border-border/30 px-2 text-xs md:text-sm text-muted-foreground flex items-start pt-1 font-medium"
              >
                {format(hour, 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day content */}
          <div 
            className="flex-1 relative"
            ref={(el) => setDayRef(currentDate, el)}
          >
            {hours.map((hour, idx) => (
              <div
                key={hour.toString()}
                className={cn(
                  'h-20 border-b border-border/20 hover:bg-accent/30 cursor-pointer transition-colors relative',
                  idx % 2 === 0 && 'bg-muted/5'
                )}
                onClick={() => openNewBooking(currentDate)}
              >
                {/* 30-minute line */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/15" />
              </div>
            ))}

            {/* Drop indicator */}
            <DropIndicator date={currentDate} />

            {/* Bookings overlay */}
            <AnimatePresence>
              {dayBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} variant="day" />
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {dayBookings.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
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
          <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="p-2 text-center text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
                {week.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isCurrentDay = isToday(day);

                  return (
                    <motion.div
                      key={day.toString()}
                      whileHover={{ backgroundColor: 'rgba(var(--accent), 0.1)' }}
                      className={cn(
                        'min-h-[80px] md:min-h-[100px] border-r border-border/30 last:border-r-0 p-1 cursor-pointer transition-colors',
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
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs md:text-sm font-semibold transition-colors',
                            !isCurrentMonth && 'text-muted-foreground/40',
                            isCurrentDay && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayBookings.length > 0 && (
                          <span className="text-[10px] font-medium text-primary">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((booking) => {
                          const style = statusGradients[booking.status] || statusGradients.pending;
                          return (
                            <motion.div
                              key={booking.id}
                              whileHover={{ scale: 1.02 }}
                              className={cn(
                                'text-[10px] md:text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer flex items-center gap-1',
                                'bg-gradient-to-r border backdrop-blur-sm',
                                style.bg,
                                'border-transparent'
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                openBookingDetail(booking);
                              }}
                            >
                              <StatusDot status={booking.status as BookingStatus} size="sm" />
                              <span className="font-semibold tabular-nums">{booking.start_time.substring(0, 5)}</span>
                              <span className="truncate hidden sm:inline text-muted-foreground">
                                {booking.client_name}
                              </span>
                            </motion.div>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <p className="text-[10px] md:text-xs text-primary font-semibold px-1">
                            +{dayBookings.length - 3} más
                          </p>
                        )}
                      </div>
                    </motion.div>
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-3"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando calendario...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
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
          <h2 className="text-base md:text-lg font-bold capitalize truncate">
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

      {/* Drag hint */}
      <AnimatePresence>
        {dragState.isDragging && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium"
          >
            Arrastra a la nueva hora • Suelta para confirmar
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Button */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 md:hidden z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30"
        onClick={() => openNewBooking()}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Calendar Content */}
      <Card className="flex-1 m-2 md:m-4 mt-0 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
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
