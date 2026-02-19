import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  format,
  parse,
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
  isSameDay,
  differenceInMinutes,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
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
  Undo2,
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
import { Barber } from '@/types/barber';
import { ApiBooking, ApiBookingStatus, ApiCalendarEvent } from '@/types/api';
import { supabaseClientsApi } from '@/services/supabaseClients';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBookingsApi, supabaseEventBookingsApi } from '@/services/supabaseBookings';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { createNotification } from '@/services/supabaseNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCalendarDragDropEnhanced, snapToQuarterHour, isWithinBusinessHours } from '@/hooks/useCalendarDragDropEnhanced';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useAutoScrollToNow } from '@/hooks/useAutoScrollToNow';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import BookingModal from '@/components/bookings/BookingModal';
import { BookingDetailModal, BookingStatus, MonthView } from '@/components/calendar';
import { BarberLegend } from '@/components/calendar/BarberLegend';
import { MoveBookingConfirmDialog } from '@/components/calendar/MoveBookingConfirmDialog';
import { CreateChoiceDialog } from '@/components/calendar/CreateChoiceDialog';
import { EventModal, type EventFormData } from '@/components/calendar/EventModal';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { setBarberList } from '@/components/calendar/shared/colorUtils';
import { CurrentTimeIndicator } from '@/components/calendar/CurrentTimeIndicator';
import { SetmoreHeader } from '@/components/calendar/SetmoreHeader';
import { ThreeDayView } from '@/components/calendar/ThreeDayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { MobileDrawerMenu } from '@/components/calendar/MobileDrawerMenu';
import {
  BookingCard,
  EventCard,
  DroppableTimeSlotEnhanced,
  getServicePastelColor,
  getBarberPastelColor,
  getOverlapInfo,
  getBookingPosition,
  getEventPosition,
} from '@/components/calendar/shared';
import { createSnapTo15MinModifier } from '@/components/calendar/shared/snapModifier';

type ViewMode = 'day' | '3day' | 'week' | 'month' | 'agenda';

const HOUR_HEIGHT_DAY = 140;
const HOUR_HEIGHT_WEEK = 100;
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00
const START_HOUR = 0;
const BUSINESS_OPEN_HOUR = 9;
const BUSINESS_CLOSE_HOUR = 21;

export default function Calendar() {
  const { toast } = useToast();
  const { user, isBarber } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('3day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollTrigger, setScrollTrigger] = useState(0);

  // Reset to 3-day view and auto-scroll when "Agenda" nav is clicked
  useEffect(() => {
    if (location.state?.resetView) {
      setViewMode('3day');
      setCurrentDate(new Date());
      setScrollTrigger(prev => prev + 1);
      // Clear state so it doesn't re-trigger on refresh
      navigate('/calendar', { replace: true, state: {} });
    }
  }, [location.state?.resetView, navigate]);

  // Auto-scroll to current time
  const currentHourHeightForScroll = viewMode === 'day' || viewMode === '3day' ? HOUR_HEIGHT_DAY : HOUR_HEIGHT_WEEK;
  const scrollContainerRef = useAutoScrollToNow(
    START_HOUR,
    currentHourHeightForScroll,
    [viewMode, scrollTrigger]
  );
  
  // Main container needs to be a fixed height with overflow hidden, header fixed, content scrolls
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [isSlotCreation, setIsSlotCreation] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  // Event state
  const [calendarEvents, setCalendarEvents] = useState<ApiCalendarEvent[]>([]);
  const [isChoiceDialogOpen, setIsChoiceDialogOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiCalendarEvent | null>(null);

  // Set view mode based on screen size
  useEffect(() => {
    if (isMobile && viewMode === 'week') {
      setViewMode('agenda');
    }
  }, [isMobile, viewMode]);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allBookingsData, clientsData, servicesData, barbersData] = await Promise.all([
        supabaseBookingsApi.getAll(),
        supabaseClientsApi.getAll(),
        supabaseServicesApi.getAll(),
        supabaseBarbersApi.getAll(false),
      ]);

      // Separate regular bookings from event-type bookings
      const regularBookings: ApiBooking[] = [];
      const eventBookings: ApiCalendarEvent[] = [];

      for (const b of allBookingsData) {
        if (b.booking_type === 'event') {
          eventBookings.push({
            id: b.id,
            business_id: b.business_id,
            name: b.event_name || b.client_name || '',
            event_date: b.booking_date,
            start_time: b.start_time,
            end_time: b.end_time,
            repeat: (b.recurrence_rule as { frequency?: string } | null)?.frequency as ApiCalendarEvent['repeat'] || 'none',
            location: b.location || null,
            notes: b.notes || null,
            barber: b.barber || null,
            color: b.color || '#d1d5db',
            created_at: b.created_at,
            updated_at: b.updated_at,
          });
        } else {
          regularBookings.push(b);
        }
      }

      setBookings(regularBookings);
      setClients(clientsData);
      setServices(servicesData);
      setBarbers(barbersData);
      setCalendarEvents(eventBookings);
      console.log('✅ Calendar data loaded from Supabase:', regularBookings.length, 'bookings,', eventBookings.length, 'events');
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

  // Auto-set barber filter for barber users (employees only see their own bookings)
  useEffect(() => {
    if (isBarber && user?.name) {
      setSelectedBarber(user.name);
    }
  }, [isBarber, user?.name]);

  // Real-time subscription for bookings from web/external sources
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `business_id=eq.${getBusinessId()}`,
        },
        async (payload) => {
          const newBooking = payload.new as ApiBooking;
          console.log('🔔 New booking from external source:', newBooking);
          
          // Only create notification if booking was created from web (not from this session)
          if (newBooking.source === 'online') {
            try {
              await createNotification({
                user_id: user.id,
                business_id: getBusinessId(),
                type: 'booking_created',
                title: 'Nueva reserva online',
                message: `${newBooking.client_name} ha reservado ${newBooking.service_name} para el ${format(new Date(newBooking.booking_date), 'dd/MM/yyyy', { locale: es })} a las ${newBooking.start_time.substring(0, 5)}`,
                metadata: {
                  booking_id: newBooking.id,
                  client_name: newBooking.client_name,
                  service_name: newBooking.service_name,
                  booking_date: newBooking.booking_date,
                  start_time: newBooking.start_time,
                },
              });
              console.log('✅ Notification created for online booking');
            } catch (error) {
              console.error('Failed to create notification:', error);
            }
          }
          
          // Refresh bookings list
          loadData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadData]);

  // Real-time subscription for users table changes (new barbers added externally)
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    let businessId: string;
    try {
      businessId = getBusinessId();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`calendar-users-sync-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `business_id=eq.${businessId}` },
        () => {
          loadDataRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Current hour height based on view mode
  const currentHourHeight = viewMode === 'day' ? HOUR_HEIGHT_DAY : HOUR_HEIGHT_WEEK;

  // Enhanced drag and drop setup with 15-min snapping
  const {
    activeId,
    activeBooking,
    dropPreview,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    handleUndo,
    undoStack,
    isUpdating,
    showConfirmDialog,
    pendingMove,
    confirmMove,
    cancelMove,
  } = useCalendarDragDropEnhanced({
    bookings,
    barbers,
    onBookingUpdate: (id, updated) => {
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
    },
    onBookingsChange: setBookings,
    hourHeight: currentHourHeight,
    startHour: START_HOUR,
  });

  // Compute active booking duration and client name for ghost preview cards
  const activeBookingDuration = useMemo(() => {
    if (!activeBooking) return undefined;
    const start = parse(activeBooking.start_time, 'HH:mm:ss', new Date());
    const end = parse(activeBooking.end_time, 'HH:mm:ss', new Date());
    return differenceInMinutes(end, start);
  }, [activeBooking]);
  const activeBookingClientName = activeBooking?.client_name;
  const activeBookingServiceName = activeBooking?.service_name;
  const activeBookingColorClasses = useMemo(() => {
    if (!activeBooking) return undefined;
    return getBarberPastelColor(activeBooking);
  }, [activeBooking]);

  // Configure sensors for drag-drop with long-press on mobile
  // Touch delay of 300ms prevents conflicts with scrolling on mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    })
  );

  // Calculate column width for horizontal snapping
  const [calendarColumnWidth, setCalendarColumnWidth] = useState(0);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (!calendarContainerRef.current) return;
      const containerWidth = calendarContainerRef.current.offsetWidth;
      const timeLabelWidth = 48; // w-12 = 48px
      const contentWidth = containerWidth - timeLabelWidth;
      const numCols = viewMode === '3day' ? 3 : viewMode === 'week' ? 7 : 1;
      setCalendarColumnWidth(contentWidth / numCols);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [viewMode]);

  // Snap modifier: snaps drag movement to 15-min grid (Y) and day columns (X)
  const snapModifier = useMemo(
    () => createSnapTo15MinModifier(
      currentHourHeight / 4,
      viewMode !== 'day' && viewMode !== 'month' && viewMode !== 'agenda' ? calendarColumnWidth : undefined
    ),
    [currentHourHeight, calendarColumnWidth, viewMode]
  );
  const modifiers = useMemo(() => [snapModifier], [snapModifier]);

  // Swipe gesture for mobile navigation
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => navigateDate('next'),
    onSwipeRight: () => navigateDate('prev'),
  });

  // Extract unique barber names for filter dropdown
  const barberNames = useMemo(() => {
    const barberSet = new Set<string>();
    bookings.forEach((b) => {
      if (b.barber) barberSet.add(b.barber);
    });
    return Array.from(barberSet).sort();
  }, [bookings]);

  // Set barber list for consistent coloring
  useEffect(() => {
    setBarberList(barberNames);
  }, [barberNames]);

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
      case '3day':
        setCurrentDate((d) => (direction === 'next' ? addDays(d, 3) : subDays(d, 3)));
        break;
      case 'week':
      case 'agenda':
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
    const start = setMinutes(setHours(new Date(), 0), 0);
    const end = setMinutes(setHours(new Date(), 23), 0);
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
    setIsSlotCreation(false);
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  // Open choice dialog (booking vs event) for new creation
  const openCreateChoice = (date?: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setIsSlotCreation(!!date); // slot creation when triggered from a calendar slot
    setSelectedBooking(null);
    setSelectedEvent(null);
    setIsChoiceDialogOpen(true);
  };

  const openNewBooking = (date?: Date, time?: string) => {
    if (date) setSelectedDate(date);
    if (time) setSelectedTime(time);
    setIsModalOpen(true);
  };

  const openNewEvent = (date?: Date, time?: string) => {
    if (date) setSelectedDate(date);
    if (time) setSelectedTime(time);
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const openBookingDetail = (booking: ApiBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const openEventDetail = (event: ApiCalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDetailOpen(true);
  };

  const handleEditEvent = (event: ApiCalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDetailOpen(false);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const previous = [...calendarEvents];
    setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
    setIsEventDetailOpen(false);
    setSelectedEvent(null);
    try {
      await supabaseEventBookingsApi.delete(eventId);
      toast({ title: 'Evento eliminado correctamente' });
    } catch {
      setCalendarEvents(previous);
      toast({ title: 'Error al eliminar el evento', variant: 'destructive' });
    }
  };

  // Helper: convert an event-type ApiBooking row to ApiCalendarEvent for the UI
  const bookingToCalendarEvent = useCallback((b: ApiBooking): ApiCalendarEvent => ({
    id: b.id,
    business_id: b.business_id,
    name: b.event_name || b.client_name || '',
    event_date: b.booking_date,
    start_time: b.start_time,
    end_time: b.end_time,
    repeat: (b.recurrence_rule as { frequency?: string } | null)?.frequency as ApiCalendarEvent['repeat'] || 'none',
    location: b.location || null,
    notes: b.notes || null,
    barber: b.barber || null,
    color: b.color || '#d1d5db',
    created_at: b.created_at,
    updated_at: b.updated_at,
  }), []);

  const buildRecurrenceRule = (repeat: string): Record<string, unknown> | null => {
    if (repeat === 'none') return null;
    return { frequency: repeat };
  };

  const handleSaveEvent = async (data: EventFormData) => {
    try {
      if (selectedEvent) {
        // Update existing event
        const updatedBooking = await supabaseEventBookingsApi.update(selectedEvent.id, {
          event_name: data.name,
          booking_date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          barber: data.barber,
          user_id: data.barberId || null,
          location: data.location || null,
          notes: data.notes || null,
          color: data.color,
          is_recurring: data.repeat !== 'none',
          recurrence_rule: buildRecurrenceRule(data.repeat),
        });
        const updatedEvent = bookingToCalendarEvent(updatedBooking);
        setCalendarEvents((prev) =>
          prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e))
        );
        toast({ title: 'Evento actualizado correctamente' });
      } else {
        // Create new event
        const createdBooking = await supabaseEventBookingsApi.create({
          event_name: data.name,
          booking_date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          barber: data.barber,
          user_id: data.barberId || null,
          location: data.location || null,
          notes: data.notes || null,
          color: data.color,
          is_recurring: data.repeat !== 'none',
          recurrence_rule: buildRecurrenceRule(data.repeat),
        });
        const createdEvent = bookingToCalendarEvent(createdBooking);
        setCalendarEvents((prev) => [...prev, createdEvent]);
        toast({ title: 'Evento creado correctamente' });
      }
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el evento';
      toast({ title: message, variant: 'destructive' });
      throw error; // Re-throw so EventModal keeps its loading state
    }
  };

  // Get events for a specific day (including repeated events), filtered by barber
  const getEventsForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    return calendarEvents.filter((event) => {
      // Filter by barber if one is selected
      if (selectedBarber && event.barber !== selectedBarber) return false;

      // Exact date match
      if (event.event_date === dateStr) return true;
      // Repeated events
      if (event.repeat === 'daily' && event.event_date <= dateStr) return true;
      if (event.repeat === 'weekly' && event.event_date <= dateStr) {
        const eventDate = new Date(event.event_date + 'T00:00:00');
        return eventDate.getDay() === dayOfWeek;
      }
      if (event.repeat === 'monthly' && event.event_date <= dateStr) {
        const eventDate = new Date(event.event_date + 'T00:00:00');
        return eventDate.getDate() === dayOfMonth;
      }
      return false;
    });
  }, [calendarEvents, selectedBarber]);

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
                className="border-b border-border px-2 text-xs md:text-sm text-muted-foreground flex items-start pt-1"
                style={{ height: HOUR_HEIGHT_DAY }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day content */}
          <div className="flex-1 relative min-w-[200px]">
            {HOURS.map((hour) => (
              <DroppableTimeSlotEnhanced
                key={hour}
                id={`day-${dateStr}-${hour}`}
                hour={hour}
                date={dateStr}
                hourHeight={HOUR_HEIGHT_DAY}
                isDropTarget={dropPreview?.date === dateStr && dropPreview?.time?.startsWith(hour.toString().padStart(2, '0'))}
                previewTime={dropPreview?.date === dateStr ? dropPreview?.time : null}
                hasConflict={dropPreview?.hasConflict}
                scheduleError={dropPreview?.scheduleError}
                isOutsideBusinessHours={!isWithinBusinessHours(hour, BUSINESS_OPEN_HOUR, BUSINESS_CLOSE_HOUR)}
                isDragging={!!activeId}
                draggedBookingDuration={activeBookingDuration}
                draggedBookingClientName={activeBookingClientName}
                draggedBookingServiceName={activeBookingServiceName}
                draggedBookingColorClasses={activeBookingColorClasses}
                className="hover:bg-muted/30 cursor-pointer"
              >
                <div
                  className="absolute inset-0"
                  onClick={() => openCreateChoice(currentDate, `${hour.toString().padStart(2, '0')}:00`)}
                />
              </DroppableTimeSlotEnhanced>
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
                  isPendingMove={pendingMove?.booking.id === booking.id}
                />
              );
            })}

            {/* Events overlay */}
            {getEventsForDay(currentDate).map((event) => {
              const evtStyle = getEventPosition(event, HOUR_HEIGHT_DAY);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  style={{
                    top: evtStyle.top,
                    height: evtStyle.height,
                    left: '4px',
                    width: 'calc(100% - 8px)',
                  }}
                  onClick={() => openEventDetail(event)}
                  viewMode="day"
                  isMobile={isMobile}
                />
              );
            })}

            {/* Current time indicator */}
            {isToday(currentDate) && (
              <CurrentTimeIndicator
                currentDate={currentDate}
                startHour={START_HOUR}
                endHour={23}
                hourHeight={HOUR_HEIGHT_DAY}
              />
            )}

            {/* Empty state */}
            {dayBookings.length === 0 && getEventsForDay(currentDate).length === 0 && (
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
            className="border-b border-border px-1 md:px-2 text-[10px] md:text-xs text-muted-foreground flex items-start pt-1"
            style={{ height: HOUR_HEIGHT_WEEK }}
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
                onClick={() => openCreateChoice(day)}
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
                  <DroppableTimeSlotEnhanced
                    key={hour}
                    id={`week-${dateStr}-${hour}`}
                    hour={hour}
                    date={dateStr}
                    hourHeight={HOUR_HEIGHT_WEEK}
                    isDropTarget={dropPreview?.date === dateStr && dropPreview?.time?.startsWith(hour.toString().padStart(2, '0'))}
                    previewTime={dropPreview?.date === dateStr ? dropPreview?.time : null}
                    hasConflict={dropPreview?.hasConflict}
                    scheduleError={dropPreview?.scheduleError}
                    isOutsideBusinessHours={!isWithinBusinessHours(hour, BUSINESS_OPEN_HOUR, BUSINESS_CLOSE_HOUR)}
                    isDragging={!!activeId}
                    draggedBookingDuration={activeBookingDuration}
                    draggedBookingClientName={activeBookingClientName}
                    draggedBookingServiceName={activeBookingServiceName}
                    draggedBookingColorClasses={activeBookingColorClasses}
                    className="hover:bg-muted/30 cursor-pointer"
                  >
                    <div
                      className="absolute inset-0"
                      onClick={() => openCreateChoice(day, `${hour.toString().padStart(2, '0')}:00`)}
                    />
                  </DroppableTimeSlotEnhanced>
                ))}

                {/* Current time indicator - only on today's column */}
                {isCurrentDay && (
                  <CurrentTimeIndicator
                    currentDate={day}
                    startHour={START_HOUR}
                    endHour={23}
                    hourHeight={HOUR_HEIGHT_WEEK}
                  />
                )}

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
                      isPendingMove={pendingMove?.booking.id === booking.id}
                    />
                  );
                })}

                {/* Events overlay */}
                {getEventsForDay(day).map((event) => {
                  const evtStyle = getEventPosition(event, HOUR_HEIGHT_WEEK);
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      style={{
                        top: evtStyle.top,
                        height: evtStyle.height,
                        left: '2px',
                        width: 'calc(100% - 4px)',
                      }}
                      onClick={() => openEventDetail(event)}
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
      modifiers={modifiers}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={calendarContainerRef} className="h-screen flex flex-col overflow-hidden">
        {/* Setmore-style Header - Fixed, never scrolls */}
        <div className="flex-shrink-0">
          <SetmoreHeader
            currentDate={currentDate}
            onDateChange={(date) => {
              setCurrentDate(date);
              if (viewMode === 'agenda' || viewMode === '3day') {
                // In agenda view or 3-day view, keep the current view mode
              } else {
                setViewMode('day');
              }
            }}
            onMenuClick={() => setIsMobileMenuOpen(true)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            barberNames={barberNames}
            selectedBarber={selectedBarber}
            onBarberChange={setSelectedBarber}
            isMobile={isMobile}
          />
        </div>

        {/* Mobile Drawer Menu */}
        <MobileDrawerMenu
          open={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
          currentViewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewModeSelector={isMobile}
        />

        {/* Mobile Floating Action Button - Setmore style */}
        <button
          className="fixed right-4 md:hidden z-50 h-14 w-14 rounded-full flex items-center justify-center transition-transform active:scale-95 bg-primary"
          style={{
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)',
            boxShadow: '0 4px 14px hsl(217 91% 60% / 0.4), 0 2px 6px rgba(0, 0, 0, 0.1)',
          }}
          onClick={() => {
            setIsSlotCreation(false);
            setSelectedTime(undefined);
            openCreateChoice();
          }}
        >
          <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
        </button>

        {/* Calendar Content - This area scrolls */}
        <Card className="flex-1 m-2 md:m-4 mt-0 overflow-hidden border-border flex flex-col min-h-0">
          <div ref={scrollContainerRef} className={cn("flex-1", viewMode === 'agenda' ? 'overflow-hidden' : 'overflow-auto')}>
            {viewMode === 'day' && renderDayView()}
            {viewMode === '3day' && (
              <ThreeDayView
                currentDate={currentDate}
                bookings={filteredBookings}
                services={services}
                onDateChange={setCurrentDate}
                onBookingClick={openBookingDetail}
                onSlotClick={(date, time) => {
                  openCreateChoice(date, time);
                }}
                hourHeight={HOUR_HEIGHT_DAY}
                barberNames={barberNames}
                isDragging={!!activeId}
                dropPreview={dropPreview}
                businessOpenHour={BUSINESS_OPEN_HOUR}
                businessCloseHour={BUSINESS_CLOSE_HOUR}
                draggedBookingDuration={activeBookingDuration}
                draggedBookingClientName={activeBookingClientName}
                draggedBookingServiceName={activeBookingServiceName}
                draggedBookingColorClasses={activeBookingColorClasses}
                pendingMoveBookingId={pendingMove?.booking.id}
                events={calendarEvents}
                getEventsForDay={getEventsForDay}
                onEventClick={openEventDetail}
              />
            )}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'agenda' && (
              <AgendaView
                currentDate={currentDate}
                bookings={filteredBookings}
                services={services}
                onBookingClick={openBookingDetail}
                getEventsForDay={getEventsForDay}
                onEventClick={openEventDetail}
              />
            )}
          </div>

          {/* Barber Legend - always visible below calendar (not for agenda) */}
          {viewMode !== 'agenda' && viewMode !== '3day' && <BarberLegend barberNames={barberNames} />}
        </Card>

        {/* Undo Button */}
        {undoStack.length > 0 && (
          <div className="fixed bottom-28 left-4 md:bottom-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastAction = undoStack[undoStack.length - 1];
                if (lastAction) handleUndo(lastAction.bookingId, lastAction.previousState);
              }}
              className="shadow-lg bg-card"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Deshacer
            </Button>
          </div>
        )}

        {/* Background dim overlay during drag */}
        <div
          className={cn(
            'fixed inset-0 bg-black/30 pointer-events-none z-[100]',
            'transition-opacity duration-300 ease-in-out',
            activeId ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Time slot indicator - left side of screen */}
        <div
          className={cn(
            'fixed left-0 top-1/2 -translate-y-1/2 z-[110] pointer-events-none',
            'transition-all duration-200 ease-out',
            activeId && dropPreview?.time
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-full'
          )}
        >
          <div className="bg-primary text-primary-foreground pl-4 pr-5 py-2.5 rounded-r-2xl shadow-2xl flex items-center gap-2">
            <span className="text-xl font-bold tabular-nums tracking-wide">
              {dropPreview?.time || ''}
            </span>
          </div>
        </div>

        {/* DragOverlay removed - ghost card is rendered inside DroppableTimeSlotEnhanced */}

        {/* Booking Detail Modal */}
        <BookingDetailModal
          booking={selectedBooking}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            // Delay clearing booking so the Dialog close animation can
            // finish rendering with the last booking data via the ref.
            setTimeout(() => setSelectedBooking(null), 250);
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
            barber: selectedBooking.barber,
            date: selectedBooking.booking_date,
            time: selectedBooking.start_time.substring(0, 5),
            status: selectedBooking.status.replace('_', '-') as any,
            source: selectedBooking.source.replace('_', '-') as any,
            notes: selectedBooking.notes || '',
            createdAt: selectedBooking.created_at,
          } : null}
          clients={clients}
          services={services}
          barbers={barbers}
          onClientCreate={async (clientData) => {
            const newClient = await supabaseClientsApi.create({
              name: clientData.name || '',
              phone: clientData.phone || '',
              email: clientData.email || '',
              notes: clientData.notes || '',
              tags: clientData.tags || [],
            });
            setClients(prev => [...prev, newClient]);
            return newClient;
          }}
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
                  barber: data.barber || null,
                });
                
                setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updatedBooking : b));
                
                // Create notification for booking modification
                if (user?.id) {
                  try {
                    await createNotification({
                      user_id: user.id,
                      business_id: getBusinessId(),
                      type: 'booking_modified',
                      title: 'Reserva modificada',
                      message: `${data.clientName} - ${data.serviceName} actualizada al ${format(new Date(data.date || ''), 'dd/MM/yyyy', { locale: es })} a las ${data.time}`,
                      metadata: {
                        booking_id: selectedBooking.id,
                        client_name: data.clientName,
                        service_name: data.serviceName,
                        booking_date: data.date,
                        start_time: data.time,
                      },
                    });
                  } catch (notifError) {
                    console.error('Failed to create notification:', notifError);
                  }
                }
                
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
                  barber: data.barber || null,
                });
                
                setBookings(prev => [...prev, newBooking]);
                
                // Create notification for new booking
                if (user?.id) {
                  try {
                    await createNotification({
                      user_id: user.id,
                      business_id: getBusinessId(),
                      type: 'booking_created',
                      title: 'Nueva reserva',
                      message: `${data.clientName} ha reservado ${data.serviceName} para el ${format(new Date(data.date || ''), 'dd/MM/yyyy', { locale: es })} a las ${data.time}`,
                      metadata: {
                        booking_id: newBooking.id,
                        client_name: data.clientName,
                        service_name: data.serviceName,
                        booking_date: data.date,
                        start_time: data.time,
                      },
                    });
                  } catch (notifError) {
                    console.error('Failed to create notification:', notifError);
                  }
                }
                
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
          selectedTime={selectedTime}
          isSlotCreation={isSlotCreation}
          preselectedBarberName={selectedBarber}
        />

        {/* Move Booking Confirmation Dialog */}
        <MoveBookingConfirmDialog
          open={showConfirmDialog}
          details={pendingMove}
          onConfirm={confirmMove}
          onCancel={cancelMove}
          isLoading={isUpdating}
        />

        {/* Choice Dialog: Booking vs Event */}
        <CreateChoiceDialog
          open={isChoiceDialogOpen}
          onOpenChange={setIsChoiceDialogOpen}
          onChooseBooking={() => openNewBooking(selectedDate, selectedTime)}
          onChooseEvent={() => openNewEvent(selectedDate, selectedTime)}
        />

        {/* Event Modal for new/edit events */}
        <EventModal
          open={isEventModalOpen}
          onOpenChange={(open) => {
            setIsEventModalOpen(open);
            if (!open) setSelectedEvent(null);
          }}
          event={selectedEvent}
          barbers={barbers}
          onSave={handleSaveEvent}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          open={isEventDetailOpen}
          onClose={() => {
            setIsEventDetailOpen(false);
            setTimeout(() => setSelectedEvent(null), 250);
          }}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      </div>
    </DndContext>
  );
}
