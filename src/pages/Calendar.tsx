import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  MouseSensor,
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
import { Client, Service, BookingStatus, BookingSource, BusinessHours } from '@/types';
import { Barber, BarberSchedule } from '@/types/barber';
import { ApiBooking, ApiBookingStatus, ApiCalendarEvent, ApiPaymentMethod } from '@/types/api';
import { supabaseClientsApi } from '@/services/supabaseClients';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBookingsApi, supabaseEventBookingsApi } from '@/services/supabaseBookings';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { notifyAllAdmins, notifyBookingUsers } from '@/services/supabaseNotifications';
import { supabaseBusinessHoursApi } from '@/services/supabaseBusinessHours';
import { useBookings, useClients, useServices, useBarbers, useBusinessHours, useClosureDates, useInvalidateQuery } from '@/hooks/useQueryHooks';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { getBusinessId } from '@/config/session';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCalendarDragDropEnhanced, snapToQuarterHour, isWithinBusinessHours } from '@/hooks/useCalendarDragDropEnhanced';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useAutoScrollToNow } from '@/hooks/useAutoScrollToNow';
import { useAutoScrollOnDrag } from '@/hooks/useAutoScrollOnDrag';
import { useSlotSelection } from '@/hooks/useSlotSelection';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import BookingModal from '@/components/bookings/BookingModal';
import { BookingDetailModal, MonthView } from '@/components/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoveBookingConfirmDialog } from '@/components/calendar/MoveBookingConfirmDialog';
import { MoveEventConfirmDialog } from '@/components/calendar/MoveEventConfirmDialog';
import { CreateChoiceDialog } from '@/components/calendar/CreateChoiceDialog';
import { EventModal, type EventFormData } from '@/components/calendar/EventModal';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { setBarberList, setBarberColorOverrides } from '@/components/calendar/shared/colorUtils';
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
  getUnifiedOverlapInfo,
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
  const staffTerms = useStaffTerms();
  const isMobile = useIsMobile();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('3day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollTrigger, setScrollTrigger] = useState(0);

  // Track booking IDs created locally to avoid duplicate notifications from real-time subscription
  const locallyCreatedBookingIds = useRef<Set<string>>(new Set());

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
  
  // Main container needs to be a fixed height with overflow hidden, header fixed, content scrolls
  // ── React Query data fetching (cached across navigations) ──
  const queryClient = useQueryClient();

  // Scope bookings to a ±2 month window around the current calendar date
  // This avoids fetching all-time data and keeps payloads manageable
  const bookingsDateRange = useMemo(() => {
    const windowStart = subMonths(currentDate, 2);
    const windowEnd = addMonths(currentDate, 2);
    return {
      start_date: format(windowStart, 'yyyy-MM-dd'),
      end_date: format(windowEnd, 'yyyy-MM-dd'),
    };
  }, [currentDate]);

  const { data: allBookingsData = [], isLoading: isLoadingBookings } = useBookings(bookingsDateRange);
  const { data: queryClients = [], isLoading: isLoadingClients } = useClients();
  const { data: queryServices = [], isLoading: isLoadingServices } = useServices();
  const { data: queryBarbers = [], isLoading: isLoadingBarbers } = useBarbers(false);
  const { data: queryBusinessHours = {}, isLoading: isLoadingHours } = useBusinessHours();
  const { data: queryClosureDates = [] } = useClosureDates();
  const closureDateSet = useMemo(
    () => new Set(queryClosureDates.filter((c) => c.isClosed).map((c) => c.date)),
    [queryClosureDates]
  );
  const { invalidateBookings, invalidateBarbers, invalidateClients, invalidateServices, invalidateBusinessHours } = useInvalidateQuery();

  const isLoading = isLoadingBookings || isLoadingClients || isLoadingServices || isLoadingBarbers || isLoadingHours;

  // Auto-scroll to current time. `isLoading` is in deps so the scroll
  // re-runs once the calendar mounts after the initial loading spinner.
  const scrollContainerRef = useAutoScrollToNow(
    START_HOUR,
    currentHourHeightForScroll,
    [viewMode, scrollTrigger, isLoading]
  );

  // Local state for optimistic updates — seeded from query data
  const [localBookings, setLocalBookings] = useState<ApiBooking[] | null>(null);
  const [localClients, setLocalClients] = useState<Client[] | null>(null);
  const [localEvents, setLocalEvents] = useState<ApiCalendarEvent[] | null>(null);

  // Parse query data: separate regular bookings from event-type bookings
  const { queryBookings, queryEvents } = useMemo(() => {
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
          color: b.color || '',
          created_at: b.created_at,
          updated_at: b.updated_at,
        });
      } else {
        regularBookings.push(b);
      }
    }

    return { queryBookings: regularBookings, queryEvents: eventBookings };
  }, [allBookingsData]);

  // Merge: use local optimistic state if set, otherwise use query data
  const bookings = localBookings ?? queryBookings;
  const calendarEvents = localEvents ?? queryEvents;
  const clients = localClients ?? queryClients;
  const services = queryServices;
  const barbers = queryBarbers;
  const businessHours = queryBusinessHours;

  // Alias setters for optimistic updates (existing code uses setBookings, etc.)
  const setBookings = setLocalBookings as React.Dispatch<React.SetStateAction<ApiBooking[]>>;
  const setCalendarEvents = setLocalEvents as React.Dispatch<React.SetStateAction<ApiCalendarEvent[]>>;
  const setClients = setLocalClients as React.Dispatch<React.SetStateAction<Client[]>>;

  // Reset local overrides when query data changes (new data from server)
  useEffect(() => { setLocalBookings(null); }, [queryBookings]);
  useEffect(() => { setLocalEvents(null); }, [queryEvents]);
  useEffect(() => { setLocalClients(null); }, [queryClients]);

  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [selectedEndTime, setSelectedEndTime] = useState<string | undefined>();
  const [isSlotCreation, setIsSlotCreation] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  // Event state
  const [isChoiceDialogOpen, setIsChoiceDialogOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiCalendarEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Set view mode based on screen size
  useEffect(() => {
    if (isMobile && viewMode === 'week') {
      setViewMode('agenda');
    }
  }, [isMobile, viewMode]);

  // Invalidate all calendar-related queries (replaces old loadData)
  const loadData = useCallback(() => {
    setLocalBookings(null);
    setLocalClients(null);
    setLocalEvents(null);
    invalidateBookings();
    invalidateClients();
    invalidateServices();
    invalidateBarbers();
    invalidateBusinessHours();
  }, [invalidateBookings, invalidateClients, invalidateServices, invalidateBarbers, invalidateBusinessHours]);

  // Manual refresh triggered by the refresh button (shows spinner on the button)
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    loadData();
    // Wait a short moment for queries to settle
    await new Promise(r => setTimeout(r, 500));
    setIsRefreshing(false);
  }, [loadData]);

  // Auto-set barber filter for barber users (employees only see their own bookings)
  useEffect(() => {
    if (isBarber && user?.name) {
      setSelectedBarber(user.name);
    }
  }, [isBarber, user?.name]);

  // First-load default: if the logged-in account matches an active barber profile
  // (e.g. an admin/owner who is also a barber), preselect their own column.
  // Only runs once per mount; later user changes (incl. switching to "Todos") are respected.
  const adminBarberDefaultAppliedRef = useRef(false);
  useEffect(() => {
    if (adminBarberDefaultAppliedRef.current) return;
    if (isBarber) return; // already handled by the effect above
    if (!user?.name || barbers.length === 0) return;
    const match = barbers.find((b) => b.is_active && b.name === user.name);
    if (match) {
      setSelectedBarber(match.name);
    }
    adminBarberDefaultAppliedRef.current = true;
  }, [isBarber, user?.name, barbers]);

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

          // Skip notification for bookings created locally (already notified)
          if (locallyCreatedBookingIds.current.has(newBooking.id)) {
            locallyCreatedBookingIds.current.delete(newBooking.id);
            invalidateBookings();
            return;
          }

          // Notify admins + barber when a booking comes in from online
          if (newBooking.source === 'online') {
            try {
              await notifyBookingUsers({
                business_id: getBusinessId(),
                type: 'booking_created',
                title: `Nueva reserva online - ${newBooking.barber || 'Sin asignar'}`,
                message: `${newBooking.client_name} ha reservado ${newBooking.service_name} con ${newBooking.barber || 'Sin asignar'} para el ${format(new Date(newBooking.booking_date), 'dd/MM/yyyy', { locale: es })} a las ${newBooking.start_time.substring(0, 5)}`,
                barber_user_id: newBooking.user_id,
                performed_by_user_id: '', // online booking = no logged-in user, notify everyone
                metadata: {
                  booking_id: newBooking.id,
                  client_name: newBooking.client_name,
                  service_name: newBooking.service_name,
                  booking_date: newBooking.booking_date,
                  start_time: newBooking.start_time,
                },
              });
            } catch { /* ignored */ }
          }

          // Refresh bookings list
          invalidateBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, invalidateBookings]);

  // Real-time subscription for users table changes (new barbers added externally)
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
          invalidateBarbers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateBarbers]);

  // Current hour height based on view mode
  const currentHourHeight = viewMode === 'day' ? HOUR_HEIGHT_DAY : HOUR_HEIGHT_WEEK;

  // Enhanced drag and drop setup with 15-min snapping
  const {
    activeId,
    activeBooking,
    activeEvent,
    isDraggingEvent,
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
    showEventConfirmDialog,
    pendingEventMove,
    confirmEventMove,
    cancelEventMove,
  } = useCalendarDragDropEnhanced({
    bookings,
    barbers,
    onBookingUpdate: (id, updated) => {
      setLocalBookings(prev => (prev ?? queryBookings).map(b => b.id === id ? updated : b));
    },
    onBookingsChange: setBookings,
    hourHeight: currentHourHeight,
    startHour: START_HOUR,
    events: calendarEvents,
    onEventUpdate: (id, updated) => {
      setLocalEvents(prev => (prev ?? queryEvents).map(e => e.id === id ? updated : e));
    },
    onEventsChange: setCalendarEvents,
  });

  // Auto-scroll the calendar container when dragging near edges
  useAutoScrollOnDrag(scrollContainerRef, !!activeId);

  // Compute active booking/event duration and name for ghost preview cards
  const activeBookingDuration = useMemo(() => {
    if (activeBooking) {
      const start = parse(activeBooking.start_time, 'HH:mm:ss', new Date());
      const end = parse(activeBooking.end_time, 'HH:mm:ss', new Date());
      return differenceInMinutes(end, start);
    }
    if (activeEvent) {
      const start = parse(activeEvent.start_time, 'HH:mm:ss', new Date());
      const end = parse(activeEvent.end_time, 'HH:mm:ss', new Date());
      return differenceInMinutes(end, start);
    }
    return undefined;
  }, [activeBooking, activeEvent]);
  const activeBookingClientName = activeBooking?.client_name ?? activeEvent?.name;
  const activeBookingServiceName = activeBooking?.service_name ?? (activeEvent?.location || undefined);
  const activeBookingColorClasses = useMemo(() => {
    if (activeBooking) return getBarberPastelColor(activeBooking);
    if (activeEvent) {
      // Use event's own color for ghost preview
      return {
        bg: 'bg-muted',
        hover: 'hover:bg-muted',
        text: 'text-foreground',
        border: 'border-l-muted-foreground',
      };
    }
    return undefined;
  }, [activeBooking, activeEvent]);

  // Configure sensors for drag-drop.
  // MouseSensor: solo mouse en desktop (NO intercepta touch — crítico).
  // TouchSensor: long-press 1.5s con tolerance baja para que CUALQUIER
  // movimiento del dedo durante el delay cancele la activación. Así el drag
  // solo se dispara si el dedo está quieto (scroll en pausa) 1500ms completos.
  // Nota: usamos MouseSensor en vez de PointerSensor porque PointerSensor
  // también captura touch events y su distance:8 se dispara antes del delay.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 1500,
        tolerance: 5,
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

  // Build a stable, complete barber list (includes registered barbers without
  // bookings yet and any names appearing on events) so each barber gets a
  // consistent color across appointments and events on every view.
  const allBarberNames = useMemo(() => {
    const set = new Set<string>();
    barbers.forEach((b) => { if (b.name) set.add(b.name); });
    bookings.forEach((b) => { if (b.barber) set.add(b.barber); });
    calendarEvents.forEach((e) => { if (e.barber) set.add(e.barber); });
    return Array.from(set).sort();
  }, [barbers, bookings, calendarEvents]);

  // Set barber list for consistent coloring
  useEffect(() => {
    setBarberList(allBarberNames);
  }, [allBarberNames]);

  // Build per-barber color overrides from the loaded barbers (already
  // scoped to the current business by the API). Rebuilt on every change so
  // it can never leak between businesses or sessions.
  useEffect(() => {
    const overrides: Record<string, string | null> = {};
    barbers.forEach((b) => {
      if (b.name && b.appointment_color) overrides[b.name] = b.appointment_color;
    });
    setBarberColorOverrides(overrides);
  }, [barbers]);

  // Filter bookings by barber and exclude cancelled
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'cancelled')
      .filter((b) => !selectedBarber || b.barber === selectedBarber);
  }, [bookings, selectedBarber]);

  // Determine if a given hour slot is closed/unavailable for the selected view
  // "All barbers" → only business hours; specific barber → business + barber schedule/time-off
  const DAY_INDEX_TO_NAME: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
  };

  const isHourClosed = useCallback((hour: number, date: Date): boolean => {
    const dayName = DAY_INDEX_TO_NAME[date.getDay()];

    // Helper: check if an hour overlaps with any shift in a list
    const overlapsShift = (shifts: { start: string; end: string }[]): boolean => {
      const slotStart = hour * 60;
      const slotEnd = (hour + 1) * 60;
      return shifts.some(s => {
        const [sH, sM] = s.start.split(':').map(Number);
        const [eH, eM] = s.end.split(':').map(Number);
        return sH * 60 + sM < slotEnd && eH * 60 + eM > slotStart;
      });
    };

    // Check business hours
    const dayData = businessHours[dayName];
    if (!dayData || !dayData.isOpen || dayData.shifts.length === 0) {
      return true; // business closed this day
    }
    const businessShifts = dayData.shifts.map(s => ({ start: s.openTime, end: s.closeTime }));
    if (!overlapsShift(businessShifts)) {
      return true; // outside business open shifts
    }

    // If a specific barber is selected, also check their schedule + time off
    if (selectedBarber) {
      const barber = barbers.find(b => b.name === selectedBarber);
      if (barber) {
        // Check time off (vacation)
        const dateStr = format(date, 'yyyy-MM-dd');
        const isOnTimeOff = barber.time_off?.some(
          to => dateStr >= to.start_date && dateStr <= to.end_date
        );
        if (isOnTimeOff) return true;

        // Check barber's day schedule
        const barberDay = barber.schedule?.[dayName as keyof BarberSchedule];
        if (!barberDay || !barberDay.enabled || barberDay.shifts.length === 0) {
          return true; // barber doesn't work this day
        }
        if (!overlapsShift(barberDay.shifts)) {
          return true; // outside barber's working shifts
        }
      }
    }

    return false;
  }, [businessHours, selectedBarber, barbers]);

  // Compute closed minute ranges within a partially-open hour for sub-hour shading.
  // Returns the portions of the hour (0–60 min) that are NOT covered by open shifts.
  const getClosedMinuteRanges = useCallback((hour: number, date: Date): { startMinute: number; endMinute: number }[] => {
    // If the whole hour is closed, the full bg is already applied — no partial ranges needed
    if (isHourClosed(hour, date)) return [];

    const dayName = DAY_INDEX_TO_NAME[date.getDay()];
    const slotStart = hour * 60;
    const slotEnd = (hour + 1) * 60;

    // Collect all applicable shift sets that must overlap
    const shiftSets: { start: string; end: string }[][] = [];

    // Business hours shifts
    const dayData = businessHours[dayName];
    if (dayData?.isOpen && dayData.shifts.length > 0) {
      shiftSets.push(dayData.shifts.map(s => ({ start: s.openTime, end: s.closeTime })));
    }

    // Barber shifts (if selected)
    if (selectedBarber) {
      const barber = barbers.find(b => b.name === selectedBarber);
      if (barber) {
        const barberDay = barber.schedule?.[dayName as keyof BarberSchedule];
        if (barberDay?.enabled && barberDay.shifts.length > 0) {
          shiftSets.push(barberDay.shifts);
        }
      }
    }

    if (shiftSets.length === 0) return [];

    // Convert shifts to minute ranges clipped to this hour (0–60)
    const clipToHour = (shifts: { start: string; end: string }[]): [number, number][] => {
      return shifts
        .map(s => {
          const [sH, sM] = s.start.split(':').map(Number);
          const [eH, eM] = s.end.split(':').map(Number);
          const start = Math.max(sH * 60 + sM, slotStart) - slotStart;
          const end = Math.min(eH * 60 + eM, slotEnd) - slotStart;
          return [start, end] as [number, number];
        })
        .filter(([s, e]) => e > s);
    };

    // Start with business hours clipped, then intersect with each additional shift set
    let openRanges: [number, number][] = clipToHour(shiftSets[0]);
    for (let i = 1; i < shiftSets.length; i++) {
      const otherRanges = clipToHour(shiftSets[i]);
      const intersected: [number, number][] = [];
      for (const [aS, aE] of openRanges) {
        for (const [bS, bE] of otherRanges) {
          const s = Math.max(aS, bS);
          const e = Math.min(aE, bE);
          if (s < e) intersected.push([s, e]);
        }
      }
      openRanges = intersected;
    }

    // Merge overlapping open ranges
    openRanges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of openRanges) {
      if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }

    // Complement: closed ranges are the gaps
    const closed: { startMinute: number; endMinute: number }[] = [];
    let cursor = 0;
    for (const [s, e] of merged) {
      if (cursor < s) {
        closed.push({ startMinute: cursor, endMinute: s });
      }
      cursor = e;
    }
    if (cursor < 60) {
      closed.push({ startMinute: cursor, endMinute: 60 });
    }

    return closed;
  }, [isHourClosed, businessHours, selectedBarber, barbers]);

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

  const handleStatusChange = async (bookingId: string, status: BookingStatus | ApiBookingStatus) => {
    // Normalize status to ApiBookingStatus (underscore format) for DB consistency
    const apiStatus: ApiBookingStatus = status === 'no-show' ? 'no_show' : status as ApiBookingStatus;

    const statusLabels: Record<ApiBookingStatus, string> = {
      pending: 'pendiente',
      confirmed: 'confirmada',
      completed: 'completada',
      cancelled: 'cancelada',
      no_show: 'no presentado',
    };

    const confirmed = await confirm({
      title: 'Cambiar estado de cita',
      description: `¿Estás seguro de marcar esta cita como "${statusLabels[apiStatus]}"?`,
      confirmLabel: 'Confirmar',
      variant: apiStatus === 'cancelled' ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    const previousBookings = [...bookings];
    const previousSelected = selectedBooking;

    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? { ...b, status: apiStatus, updated_at: new Date().toISOString() }
          : b
      )
    );
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking((prev) =>
        prev ? { ...prev, status: apiStatus, updated_at: new Date().toISOString() } : null
      );
    }

    try {
      await supabaseBookingsApi.updateStatus(bookingId, apiStatus);

      // Notify admins + barber about status change (in-app only, no push)
      {
        const booking = previousBookings.find((b) => b.id === bookingId);
        try {
          await notifyBookingUsers({
            business_id: getBusinessId(),
            type: 'booking_status_changed',
            title: 'Estado de cita cambiado',
            message: `${user?.name || 'Usuario'} cambió la cita de ${booking?.client_name || 'cliente'} a "${statusLabels[apiStatus]}"`,
            barber_user_id: booking?.user_id,
            performed_by_user_id: user?.id || '',
            metadata: {
              booking_id: bookingId,
              client_name: booking?.client_name,
              new_status: apiStatus,
              changed_by: user?.name,
            },
          });
        } catch { /* ignored */ }
      }

      toast({ title: `Cita marcada como ${statusLabels[apiStatus]}` });
    } catch (error) {
      setBookings(previousBookings);
      setSelectedBooking(previousSelected);
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const handlePaymentChange = async (bookingId: string, method: ApiPaymentMethod | null) => {
    const previousBookings = [...bookings];
    const previousSelected = selectedBooking;

    const isPaying = method !== null;
    const now = new Date().toISOString();

    // Optimistic update — use resolved `bookings` (not raw localBookings which may be null)
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              payment_status: isPaying ? 'paid' as const : 'unpaid' as const,
              payment_method: method,
              paid_at: isPaying ? now : null,
              updated_at: now,
            }
          : b
      )
    );
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking((prev) =>
        prev
          ? {
              ...prev,
              payment_status: isPaying ? 'paid' as const : 'unpaid' as const,
              payment_method: method,
              paid_at: isPaying ? now : null,
              updated_at: now,
            }
          : null
      );
    }

    try {
      if (isPaying) {
        await supabaseBookingsApi.updatePayment(bookingId, method);
      } else {
        await supabaseBookingsApi.clearPayment(bookingId);
      }
      const methodLabels: Record<string, string> = { cash: 'efectivo', card: 'tarjeta', bizum: 'Bizum' };
      toast({
        title: isPaying
          ? `Pago registrado (${methodLabels[method]})`
          : 'Pago desmarcado',
      });
    } catch {
      setBookings(previousBookings);
      setSelectedBooking(previousSelected);
      toast({ title: 'Error al actualizar el pago', variant: 'destructive' });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar cita?',
      description: 'Se eliminará permanentemente esta cita. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const previousBookings = [...bookings];
    const deletedBooking = bookings.find((b) => b.id === bookingId);
    setBookings(bookings.filter((b) => b.id !== bookingId));
    setIsDetailOpen(false);
    setSelectedBooking(null);

    try {
      await supabaseBookingsApi.delete(bookingId);

      // Notify admins + barber about booking deletion
      if (deletedBooking) {
        try {
          await notifyBookingUsers({
            business_id: getBusinessId(),
            type: 'booking_deleted',
            title: 'Cita eliminada',
            message: `${user?.name || 'Usuario'} eliminó la cita de ${deletedBooking.client_name} (${deletedBooking.service_name})`,
            barber_user_id: deletedBooking.user_id,
            performed_by_user_id: user?.id || '',
            metadata: {
              booking_id: bookingId,
              client_name: deletedBooking.client_name,
              service_name: deletedBooking.service_name,
              deleted_by: user?.name,
            },
          });
        } catch { /* ignored */ }
      }

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
  const openCreateChoice = (date?: Date, time?: string, endTime?: string) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (closureDateSet.has(dateStr)) {
        const closure = queryClosureDates.find((c) => c.date === dateStr);
        toast({
          title: 'Día cerrado',
          description: closure?.name
            ? `El negocio está cerrado este día (${closure.name}).`
            : 'El negocio está cerrado este día.',
          variant: 'destructive',
        });
        return;
      }
    }
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedEndTime(endTime);
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

  const openNewEvent = (date?: Date, time?: string, endTime?: string) => {
    if (date) setSelectedDate(date);
    if (time) setSelectedTime(time);
    if (endTime) setSelectedEndTime(endTime);
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
    const confirmed = await confirm({
      title: '¿Eliminar evento?',
      description: 'Se eliminará permanentemente este evento. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const previous = [...calendarEvents];
    const deletedEvent = calendarEvents.find((e) => e.id === eventId);
    setCalendarEvents(calendarEvents.filter((e) => e.id !== eventId));
    setIsEventDetailOpen(false);
    setSelectedEvent(null);
    try {
      await supabaseEventBookingsApi.delete(eventId);

      // Notify all admins about event deletion
      if (deletedEvent) {
        try {
          await notifyAllAdmins({
            business_id: getBusinessId(),
            type: 'event_deleted',
            title: 'Evento eliminado',
            message: `${user?.name || 'Usuario'} eliminó el evento "${deletedEvent.name}"`,
            performed_by_user_id: user?.id || '',
            metadata: {
              event_id: eventId,
              event_name: deletedEvent.name,
              deleted_by: user?.name,
            },
          });
        } catch { /* ignored */ }
      }

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
    // Empty string = "auto" (rendering falls back to the barber's color);
    // a hex means the user picked a manual override.
    color: b.color || '',
    created_at: b.created_at,
    updated_at: b.updated_at,
  }), []);

  const buildRecurrenceRule = (repeat: string): Record<string, unknown> | null => {
    if (repeat === 'none') return null;
    return { frequency: repeat };
  };

  const handleSaveEvent = async (data: EventFormData) => {
    if (selectedEvent) {
      const confirmed = await confirm({
        title: 'Actualizar evento',
        description: '¿Confirmar los cambios en este evento?',
        confirmLabel: 'Actualizar',
      });
      if (!confirmed) return;
    }

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
          color: data.color || null,
          is_recurring: data.repeat !== 'none',
          recurrence_rule: buildRecurrenceRule(data.repeat),
        });
        const updatedEvent = bookingToCalendarEvent(updatedBooking);
        setCalendarEvents(
          calendarEvents.map((e) => (e.id === selectedEvent.id ? updatedEvent : e))
        );

        // Notify all admins about event update
        try {
          await notifyAllAdmins({
            business_id: getBusinessId(),
            type: 'event_modified',
            title: 'Evento modificado',
            message: `${user?.name || 'Usuario'} modificó el evento "${data.name}"`,
            performed_by_user_id: user?.id || '',
            metadata: {
              event_id: selectedEvent.id,
              event_name: data.name,
              event_date: data.date,
              modified_by: user?.name,
            },
          });
        } catch { /* ignored */ }

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
          color: data.color || null,
          is_recurring: data.repeat !== 'none',
          recurrence_rule: buildRecurrenceRule(data.repeat),
        });
        const createdEvent = bookingToCalendarEvent(createdBooking);
        setCalendarEvents([...calendarEvents, createdEvent]);

        // Notify all admins about new event
        try {
          await notifyAllAdmins({
            business_id: getBusinessId(),
            type: 'event_created',
            title: 'Nuevo evento creado',
            message: `${user?.name || 'Usuario'} creó el evento "${data.name}" para el ${format(new Date(data.date), 'dd/MM/yyyy', { locale: es })}`,
            performed_by_user_id: user?.id || '',
            metadata: {
              event_id: createdBooking.id,
              event_name: data.name,
              event_date: data.date,
              created_by: user?.name,
              },
            });
          } catch { /* ignored */ }

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

  // Slot selection (drag-to-create) for Day view
  const daySlotSelection = useSlotSelection({
    hourHeight: HOUR_HEIGHT_DAY,
    startHour: START_HOUR,
    scrollContainerRef,
    isDragging: !!activeId,
    onSlotSelect: (date, startTime, endTime) => openCreateChoice(date, startTime, endTime),
  });

  // Slot selection (drag-to-create) for Week view
  const weekSlotSelection = useSlotSelection({
    hourHeight: HOUR_HEIGHT_WEEK,
    startHour: START_HOUR,
    scrollContainerRef,
    isDragging: !!activeId,
    onSlotSelect: (date, startTime, endTime) => openCreateChoice(date, startTime, endTime),
  });

  const renderDayView = () => {
    const dayBookings = getBookingsForDay(currentDate);
    const dayEvents = getEventsForDay(currentDate);
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    // Build the list of barber columns. If a single barber is filtered,
    // only show that column. Otherwise show every active barber.
    const visibleBarbers = barbers
      .filter((b) => b.is_active)
      .filter((b) => !selectedBarber || b.name === selectedBarber);

    const hasBarbers = visibleBarbers.length > 0;
    const isEmpty = dayBookings.length === 0 && dayEvents.length === 0;

    return (
      <div className="flex flex-col relative w-max min-w-full">
        {/* Sticky barber header row — stays fixed vertically while scrolling
            down, and slides horizontally with its column on lateral scroll.
            z-40 keeps it above the current-time indicator (z-35). */}
        <div className="flex sticky top-0 z-40 bg-card">
          {/* Top-left corner: sticky on both axes so it covers the
              intersection of the sticky header row and the sticky time column.
              z-50 keeps it above the rest. */}
          <div className="w-16 md:w-20 shrink-0 border-r border-b border-border h-20 sticky left-0 z-50 bg-card" />
          <div className="flex-1 flex">
            {!hasBarbers && (
              <div className="flex-1 h-20 border-b border-border flex items-center justify-center text-muted-foreground text-sm">
                No hay {staffTerms.plural} disponibles
              </div>
            )}
            {visibleBarbers.map((barber) => {
              const initials = barber.name
                .split(' ')
                .map((p) => p.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={`${barber.id}-header`}
                  className="flex-1 min-w-[160px] md:min-w-[180px] border-r border-b border-border last:border-r-0 h-20 flex flex-col items-center justify-center gap-1 px-2"
                >
                  <Avatar className="h-9 w-9 md:h-10 md:w-10">
                    <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs md:text-sm font-medium text-center truncate w-full leading-tight">
                    {barber.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time grid */}
        <div className="flex flex-1">
          {/* Time column — sticky on the left so hours stay visible during
              horizontal scroll. z-30 keeps labels above column backgrounds. */}
          <div className="w-16 md:w-20 shrink-0 border-r border-border bg-card sticky left-0 z-30">
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

          {/* Barber columns — horizontal scrolling is handled by the outer
              scrollContainerRef so header and body scroll together. */}
          <div className="flex-1 flex">
            {visibleBarbers.map((barber, barberIdx) => {
              const barberBookings = dayBookings.filter((b) => b.barber === barber.name);
              const barberEvents = dayEvents.filter((e) => !e.barber || e.barber === barber.name);
              const allItems = [...barberBookings, ...barberEvents];
              const isFirstColumn = barberIdx === 0;

              return (
                <div
                  key={barber.id}
                  className="flex-1 min-w-[160px] md:min-w-[180px] border-r border-border last:border-r-0 relative"
                  onClick={(e) => daySlotSelection.handleSlotClick(currentDate, e)}
                  onMouseDown={(e) => daySlotSelection.handleMouseDown(currentDate, e)}
                  onMouseMove={daySlotSelection.handleMouseMove}
                  onMouseUp={daySlotSelection.handleMouseUp}
                  onTouchStart={(e) => daySlotSelection.handleTouchStart(currentDate, e)}
                  onTouchMove={daySlotSelection.handleTouchMove}
                  onTouchEnd={daySlotSelection.handleTouchEnd}
                >
                  {HOURS.map((hour) => (
                    <DroppableTimeSlotEnhanced
                      key={hour}
                      id={`day-${dateStr}-${hour}-${barber.id}`}
                      hour={hour}
                      date={dateStr}
                      hourHeight={HOUR_HEIGHT_DAY}
                      isDropTarget={dropPreview?.date === dateStr && dropPreview?.time?.startsWith(hour.toString().padStart(2, '0'))}
                      previewTime={dropPreview?.date === dateStr ? dropPreview?.time : null}
                      hasConflict={dropPreview?.hasConflict}
                      scheduleError={dropPreview?.scheduleError}
                      isOutsideBusinessHours={!isWithinBusinessHours(hour, BUSINESS_OPEN_HOUR, BUSINESS_CLOSE_HOUR)}
                      isClosed={isHourClosed(hour, currentDate)}
                      isDragging={!!activeId}
                      draggedBookingDuration={activeBookingDuration}
                      draggedBookingClientName={activeBookingClientName}
                      draggedBookingServiceName={activeBookingServiceName}
                      draggedBookingColorClasses={activeBookingColorClasses}
                      closedMinuteRanges={getClosedMinuteRanges(hour, currentDate)}
                      className={cn(!isHourClosed(hour, currentDate) && 'hover:bg-muted/30', 'cursor-pointer')}
                    />
                  ))}

                  {/* Bookings + Events for this barber */}
                  {barberBookings.map((booking) => {
                    const style = getBookingPosition(booking, HOUR_HEIGHT_DAY, START_HOUR);
                    const overlapInfo = getUnifiedOverlapInfo(allItems, booking);
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
                        viewMode="day"
                        isMobile={isMobile}
                        isPendingMove={pendingMove?.booking.id === booking.id}
                      />
                    );
                  })}
                  {barberEvents.map((event) => {
                    const evtStyle = getEventPosition(event, HOUR_HEIGHT_DAY, START_HOUR);
                    const overlapInfo = getUnifiedOverlapInfo(allItems, event);
                    const leftCalc = `calc(${(overlapInfo.index / overlapInfo.total) * 100}% + 2px)`;
                    const widthCalc = `calc(${100 / overlapInfo.total}% - 4px)`;

                    return (
                      <EventCard
                        key={`${event.id}-${barber.id}`}
                        event={event}
                        style={{
                          top: evtStyle.top,
                          height: evtStyle.height,
                          left: leftCalc,
                          width: widthCalc,
                        }}
                        onClick={() => openEventDetail(event)}
                        isDraggable={true}
                        viewMode="day"
                        isMobile={isMobile}
                        isPendingMove={pendingEventMove?.event.id === event.id}
                      />
                    );
                  })}

                  {/* Current time indicator on every column. The time pill
                      is only rendered on the first column so it appears once
                      on the left edge of the grid. */}
                  {isToday(currentDate) && (
                    <div className={cn(
                      "transition-opacity duration-200 ease-in-out",
                      isMonthPickerOpen ? "opacity-0" : "opacity-100"
                    )}>
                      <CurrentTimeIndicator
                        currentDate={currentDate}
                        startHour={START_HOUR}
                        endHour={23}
                        hourHeight={HOUR_HEIGHT_DAY}
                        showTimeLabel={isFirstColumn}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state when this date has no bookings/events */}
        {hasBarbers && isEmpty && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="text-center text-muted-foreground bg-background/60 px-4 py-2 rounded-md">
              <p className="text-lg font-medium">Sin citas</p>
              <p className="text-sm">No hay reservas para este día</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => (
    <div className="relative">
      {/* Sticky Day Headers */}
      <div className="flex sticky top-0 z-30 bg-card">
        <div className="w-14 md:w-16 shrink-0 border-r border-b border-border" />
        <div className="flex-1 flex">
          {weekDays.map((day) => {
            const isCurrentDay = isToday(day);
            return (
              <div
                key={day.toString() + '-header'}
                className={cn(
                  'flex-1 min-w-[100px] md:min-w-[120px] border-r border-b border-border last:border-r-0 h-12 px-1 md:px-2 py-1 text-center cursor-pointer hover:bg-muted/50 transition-colors',
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
            );
          })}
        </div>
      </div>

      {/* Time Grid */}
      <div className="flex flex-1">
        {/* Time column */}
        <div className="w-14 md:w-16 shrink-0 border-r border-border">
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

              {/* Hours grid */}
              <div
                className="relative"
                onClick={(e) => weekSlotSelection.handleSlotClick(day, e)}
                onMouseDown={(e) => weekSlotSelection.handleMouseDown(day, e)}
                onMouseMove={weekSlotSelection.handleMouseMove}
                onMouseUp={weekSlotSelection.handleMouseUp}
                onTouchStart={(e) => weekSlotSelection.handleTouchStart(day, e)}
                onTouchMove={weekSlotSelection.handleTouchMove}
                onTouchEnd={weekSlotSelection.handleTouchEnd}
              >
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
                    isClosed={isHourClosed(hour, day)}
                    isDragging={!!activeId}
                    draggedBookingDuration={activeBookingDuration}
                    draggedBookingClientName={activeBookingClientName}
                    draggedBookingServiceName={activeBookingServiceName}
                    draggedBookingColorClasses={activeBookingColorClasses}
                    closedMinuteRanges={getClosedMinuteRanges(hour, day)}
                    className={cn(!isHourClosed(hour, day) && 'hover:bg-muted/30', 'cursor-pointer')}
                  />
                ))}

                {/* Current time indicator - only on today's column */}
                {isCurrentDay && (
                  <div className={cn(
                    "transition-opacity duration-200 ease-in-out",
                    isMonthPickerOpen ? "opacity-0" : "opacity-100"
                  )}>
                    <CurrentTimeIndicator
                      currentDate={day}
                      startHour={START_HOUR}
                      endHour={23}
                      hourHeight={HOUR_HEIGHT_WEEK}
                      showTimeLabel={false}
                    />
                  </div>
                )}

                {/* Bookings + Events overlay with unified overlap detection */}
                {(() => {
                  const dayEvents = getEventsForDay(day);
                  const allItems = [...dayBookings, ...dayEvents];
                  return (
                    <>
                      {dayBookings.map((booking) => {
                        const style = getBookingPosition(booking, HOUR_HEIGHT_WEEK, START_HOUR);
                        const overlapInfo = getUnifiedOverlapInfo(allItems, booking);
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
                      {dayEvents.map((event) => {
                        const evtStyle = getEventPosition(event, HOUR_HEIGHT_WEEK, START_HOUR);
                        const overlapInfo = getUnifiedOverlapInfo(allItems, event);

                        const leftCalc = `calc(${(overlapInfo.index / overlapInfo.total) * 100}% + 2px)`;
                        const widthCalc = `calc(${100 / overlapInfo.total}% - 4px)`;

                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            style={{
                              top: evtStyle.top,
                              height: evtStyle.height,
                              left: leftCalc,
                              width: widthCalc,
                            }}
                            onClick={() => openEventDetail(event)}
                            isDraggable={true}
                            viewMode="week"
                            isPendingMove={pendingEventMove?.event.id === event.id}
                          />
                        );
                      })}
                    </>
                  );
                })()}

                {/* Selection overlay */}
                {weekSlotSelection.isSelecting && weekSlotSelection.selectionStart && isSameDay(weekSlotSelection.selectionStart.date, day) && weekSlotSelection.getSelectionStyle() && (
                  <div
                    className="absolute left-1 right-1 bg-primary/20 border-2 border-primary border-dashed rounded-md z-20 pointer-events-none"
                    style={weekSlotSelection.getSelectionStyle()!}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {weekSlotSelection.getSelectionTimeRange()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
          barberNames={barberNames}
          onDateClick={(date) => {
            setCurrentDate(date);
            setViewMode('day');
          }}
          onBookingClick={(booking) => openBookingDetail(booking)}
          getEventsForDay={getEventsForDay}
          onEventClick={openEventDetail}
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
      <div ref={calendarContainerRef} className="h-full flex flex-col overflow-hidden">
        {/* Setmore-style Header - Fixed, never scrolls */}
        <div className="flex-shrink-0 relative z-40">
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
            onRefresh={handleManualRefresh}
            isRefreshing={isRefreshing}
            onMonthPickerOpenChange={setIsMonthPickerOpen}
            onNavigate={navigateDate}
            onGoToToday={() => setCurrentDate(new Date())}
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
          className="fixed right-4 z-50 h-14 w-14 rounded-full flex items-center justify-center transition-transform active:scale-95 bg-primary"
          style={{
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)',
            boxShadow: '0 4px 14px hsl(217 91% 60% / 0.4), 0 2px 6px rgba(0, 0, 0, 0.1)',
          }}
          onClick={() => {
            setIsSlotCreation(false);
            setSelectedTime(undefined);
            setSelectedEndTime(undefined);
            openCreateChoice();
          }}
        >
          <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
        </button>

        {/* Calendar Content - This area scrolls */}
        <Card className="flex-1 m-2 md:m-4 mt-0 overflow-hidden border-border flex flex-col min-h-0 relative">
          <div ref={scrollContainerRef} className={cn(
            "flex-1",
            viewMode === 'agenda' && 'overflow-hidden',
            viewMode === 'day' && 'overflow-auto',
            viewMode === '3day' && isMobile && 'overflow-auto snap-x snap-mandatory',
            viewMode === '3day' && !isMobile && 'overflow-y-auto overflow-x-hidden',
            viewMode !== 'agenda' && viewMode !== 'day' && viewMode !== '3day' && 'overflow-y-auto overflow-x-hidden',
          )}>
            {viewMode === 'day' && renderDayView()}
            {viewMode === '3day' && (
              <ThreeDayView
                currentDate={currentDate}
                bookings={filteredBookings}
                services={services}
                onDateChange={setCurrentDate}
                onBookingClick={openBookingDetail}
                onSlotClick={(date, time, endTime) => {
                  openCreateChoice(date, time, endTime);
                }}
                hourHeight={HOUR_HEIGHT_DAY}
                barberNames={barberNames}
                isDragging={!!activeId}
                dropPreview={dropPreview}
                businessOpenHour={BUSINESS_OPEN_HOUR}
                businessCloseHour={BUSINESS_CLOSE_HOUR}
                isHourClosed={isHourClosed}
                getClosedMinuteRanges={getClosedMinuteRanges}
                draggedBookingDuration={activeBookingDuration}
                draggedBookingClientName={activeBookingClientName}
                draggedBookingServiceName={activeBookingServiceName}
                draggedBookingColorClasses={activeBookingColorClasses}
                pendingMoveBookingId={pendingMove?.booking.id}
                pendingMoveEventId={pendingEventMove?.event.id}
                events={calendarEvents}
                getEventsForDay={getEventsForDay}
                onEventClick={openEventDetail}
                scrollContainerRef={scrollContainerRef}
                isMonthPickerOpen={isMonthPickerOpen}
                isMobile={isMobile}
              />
            )}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'agenda' && (
              <AgendaView
                currentDate={currentDate}
                bookings={filteredBookings}
                services={services}
                barberNames={barberNames}
                onBookingClick={openBookingDetail}
                getEventsForDay={getEventsForDay}
                onEventClick={openEventDetail}
              />
            )}
          </div>
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
          onPaymentChange={handlePaymentChange}
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
            status: selectedBooking.status.replace('_', '-') as BookingStatus,
            source: selectedBooking.source.replace('_', '-') as BookingSource,
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
            setClients([...clients, newClient]);
            return newClient;
          }}
          onSave={async (data) => {
            if (selectedBooking) {
              const confirmed = await confirm({
                title: 'Actualizar cita',
                description: `¿Confirmar los cambios en la cita de ${data.clientName}?`,
                confirmLabel: 'Actualizar',
              });
              if (!confirmed) return;
            }

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
                  status: (data.status?.replace('-', '_') || 'confirmed') as ApiBookingStatus,
                  notes: data.notes || null,
                  user_id: data.barberId || null,
                  barber: data.barber || null,
                  client_id: data.clientId || selectedBooking.client_id,
                  client_name: data.clientName || selectedBooking.client_name,
                  client_phone: data.clientPhone || selectedBooking.client_phone,
                  client_email: data.clientEmail || null,
                  service_id: data.serviceId || selectedBooking.service_id,
                  service_name: data.serviceName || selectedBooking.service_name,
                  service_duration: duration,
                  service_price: data.servicePrice || selectedBooking.service_price,
                });
                
                setBookings(bookings.map(b => b.id === selectedBooking.id ? updatedBooking : b));
                
                // Notify admins + barber about booking modification
                try {
                  await notifyBookingUsers({
                    business_id: getBusinessId(),
                    type: 'booking_modified',
                    title: 'Reserva modificada',
                    message: `${user?.name || 'Usuario'} modificó la cita de ${data.clientName} (${data.serviceName}) al ${format(new Date(data.date || ''), 'dd/MM/yyyy', { locale: es })} a las ${data.time}`,
                    barber_user_id: data.barberId || selectedBooking.user_id,
                    performed_by_user_id: user?.id || '',
                    metadata: {
                      booking_id: selectedBooking.id,
                      client_name: data.clientName,
                      service_name: data.serviceName,
                      booking_date: data.date,
                      start_time: data.time,
                      modified_by: user?.name,
                    },
                  });
                } catch { /* ignored */ }
                
                toast({ title: 'Cita actualizada correctamente' });
              } else {
                const newBooking = await supabaseBookingsApi.create({
                  client_id: data.clientId || '',
                  service_id: data.serviceId || '',
                  user_id: data.barberId || null,
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
                
                setBookings([...bookings, newBooking]);
                locallyCreatedBookingIds.current.add(newBooking.id);

                // Notify admins + barber about new booking
                try {
                  await notifyBookingUsers({
                    business_id: getBusinessId(),
                    type: 'booking_created',
                    title: `Nueva reserva - ${data.barber || 'Sin asignar'}`,
                    message: `${user?.name || 'Usuario'} creó una cita para ${data.clientName} (${data.serviceName}) con ${data.barber || 'Sin asignar'} el ${format(new Date(data.date || ''), 'dd/MM/yyyy', { locale: es })} a las ${data.time}`,
                    barber_user_id: data.barberId || newBooking.user_id,
                    performed_by_user_id: user?.id || '',
                    metadata: {
                      booking_id: newBooking.id,
                      client_name: data.clientName,
                      service_name: data.serviceName,
                      booking_date: data.date,
                      start_time: data.time,
                      created_by: user?.name,
                    },
                  });
                } catch { /* ignored */ }
                
                toast({ title: 'Cita creada correctamente' });
              }
              
              setIsModalOpen(false);
              setSelectedBooking(null);
            } catch (error) {
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

        {/* Move Event Confirmation Dialog */}
        <MoveEventConfirmDialog
          open={showEventConfirmDialog}
          details={pendingEventMove}
          onConfirm={confirmEventMove}
          onCancel={cancelEventMove}
          isLoading={isUpdating}
        />

        {/* Choice Dialog: Booking vs Event */}
        <CreateChoiceDialog
          open={isChoiceDialogOpen}
          onOpenChange={setIsChoiceDialogOpen}
          onChooseBooking={() => openNewBooking(selectedDate, selectedTime)}
          onChooseEvent={() => openNewEvent(selectedDate, selectedTime, selectedEndTime)}
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
          selectedEndTime={selectedEndTime}
          defaultBarberId={user?.id}
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

        {/* Generic Confirmation Dialog */}
        <ConfirmActionDialog {...confirmDialogProps} />
      </div>
    </DndContext>
  );
}
