import { useState, useEffect, useMemo } from 'react';
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
  startOfMonth,
  endOfMonth,
  eachHourOfInterval,
  setHours,
  setMinutes,
  isToday,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Booking, Client, Service } from '@/types';
import { bookingsApi, clientsApi, servicesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import BookingModal from '@/components/bookings/BookingModal';
import BookingDetailPanel from '@/components/bookings/BookingDetailPanel';

type ViewMode = 'day' | 'week' | 'month';

const statusColors: Record<Booking['status'], string> = {
  pending: 'bg-status-pending/20 border-status-pending text-status-pending',
  confirmed: 'bg-primary/20 border-primary text-primary',
  completed: 'bg-status-success/20 border-status-success text-status-success',
  cancelled: 'bg-status-cancelled/20 border-status-cancelled text-status-cancelled',
  'no-show': 'bg-status-cancelled/20 border-status-cancelled text-status-cancelled',
};

export default function Calendar() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        bookingsApi.getAll(),
        clientsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setBookings(bookingsData);
      setClients(clientsData);
      setServices(servicesData);
    } catch (error) {
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const modifier = direction === 'next' ? 1 : -1;
    switch (viewMode) {
      case 'day':
        setCurrentDate((d) => new Date(d.setDate(d.getDate() + modifier)));
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
    return bookings.filter((b) => isSameDay(new Date(b.date), date));
  };

  const getBookingPosition = (booking: Booking) => {
    const [hours, minutes] = booking.time.split(':').map(Number);
    const startMinutes = (hours - 8) * 60 + minutes;
    const top = (startMinutes / 60) * 64; // 64px per hour
    const height = (booking.serviceDuration / 60) * 64;
    return { top, height: Math.max(height, 32) };
  };

  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    if (editingBooking) {
      const updated = await bookingsApi.update(editingBooking.id, bookingData);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } else {
      const created = await bookingsApi.create(bookingData as Omit<Booking, 'id' | 'createdAt'>);
      setBookings((prev) => [...prev, created]);
    }
    setEditingBooking(null);
  };

  const handleStatusChange = async (status: Booking['status']) => {
    if (!selectedBooking) return;
    const updated = await bookingsApi.update(selectedBooking.id, { status });
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBooking(updated);
    toast({ title: `Appointment marked as ${status}` });
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    await bookingsApi.delete(selectedBooking.id);
    setBookings((prev) => prev.filter((b) => b.id !== selectedBooking.id));
    setSelectedBooking(null);
    toast({ title: 'Appointment deleted' });
  };

  const openNewBooking = (date?: Date) => {
    setEditingBooking(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const openEditBooking = () => {
    setEditingBooking(selectedBooking);
    setIsModalOpen(true);
  };

  const renderWeekView = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* Time column */}
      <div className="w-16 shrink-0 border-r border-border">
        <div className="h-12 border-b border-border" />
        {hours.map((hour) => (
          <div
            key={hour.toString()}
            className="h-16 border-b border-border px-2 text-xs text-muted-foreground flex items-start pt-1"
          >
            {format(hour, 'ha')}
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
                'flex-1 min-w-[120px] border-r border-border last:border-r-0',
                isCurrentDay && 'bg-primary/5'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'h-12 border-b border-border px-2 py-1 text-center cursor-pointer hover:bg-muted/50',
                  isCurrentDay && 'bg-primary/10'
                )}
                onClick={() => openNewBooking(day)}
              >
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
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
                    className="h-16 border-b border-border hover:bg-muted/30 cursor-pointer"
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
                        'absolute left-1 right-1 rounded-md border px-2 py-1 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 overflow-hidden',
                        statusColors[booking.status]
                      )}
                      style={{ top, height }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(booking);
                      }}
                    >
                      <p className="text-xs font-medium truncate">{booking.clientName}</p>
                      <p className="text-xs opacity-75 truncate">{booking.serviceName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedBooking && (
        <div className="w-80 shrink-0">
          <BookingDetailPanel
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onEdit={openEditBooking}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteBooking}
          />
        </div>
      )}
    </div>
  );

  const renderDayView = () => {
    const dayBookings = getBookingsForDay(currentDate);

    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex">
          {/* Time column */}
          <div className="w-16 shrink-0 border-r border-border">
            {hours.map((hour) => (
              <div
                key={hour.toString()}
                className="h-16 border-b border-border px-2 text-xs text-muted-foreground flex items-start pt-1"
              >
                {format(hour, 'ha')}
              </div>
            ))}
          </div>

          {/* Day content */}
          <div className="flex-1 relative">
            {hours.map((hour) => (
              <div
                key={hour.toString()}
                className="h-16 border-b border-border hover:bg-muted/30 cursor-pointer"
                onClick={() => openNewBooking(currentDate)}
              />
            ))}

            {/* Bookings overlay */}
            {dayBookings.map((booking) => {
              const { top, height } = getBookingPosition(booking);
              return (
                <div
                  key={booking.id}
                  className={cn(
                    'absolute left-2 right-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                    statusColors[booking.status]
                  )}
                  style={{ top, height }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBooking(booking);
                  }}
                >
                  <p className="font-medium">{booking.clientName}</p>
                  <p className="text-sm opacity-75">
                    {booking.time} • {booking.serviceName}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedBooking && (
          <div className="w-80 shrink-0">
            <BookingDetailPanel
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
              onEdit={openEditBooking}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteBooking}
            />
          </div>
        )}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-border">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 grid grid-rows-6">
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
                        'min-h-[100px] border-r border-border last:border-r-0 p-1 cursor-pointer hover:bg-muted/30',
                        !isCurrentMonth && 'opacity-40',
                        isCurrentDay && 'bg-primary/5'
                      )}
                      onClick={() => openNewBooking(day)}
                    >
                      <p
                        className={cn(
                          'text-sm font-medium mb-1',
                          isCurrentDay && 'text-primary'
                        )}
                      >
                        {format(day, 'd')}
                      </p>
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={cn(
                              'text-xs px-1 py-0.5 rounded truncate cursor-pointer',
                              statusColors[booking.status]
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                            }}
                          >
                            {booking.time} {booking.clientName}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <p className="text-xs text-muted-foreground px-1">
                            +{dayBookings.length - 3} more
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

        {/* Detail panel */}
        {selectedBooking && (
          <div className="w-80 shrink-0">
            <BookingDetailPanel
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
              onEdit={openEditBooking}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteBooking}
            />
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="h-9 w-9 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="h-9 w-9 min-h-[44px] min-w-[44px]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-base md:text-xl font-semibold truncate">
            {viewMode === 'day' && format(currentDate, 'EEE, MMM d')}
            {viewMode === 'week' &&
              `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'd')}`}
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="hidden sm:flex min-h-[44px]">
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-9 md:h-10">
              <TabsTrigger value="day" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">
                <List className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Day</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">
                <LayoutGrid className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Week</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">
                <CalendarIcon className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Month</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => openNewBooking()} size="sm" className="h-9 md:h-10 min-h-[44px]">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">New Booking</span>
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <Card className="flex-1 m-2 md:m-4 mt-0 overflow-hidden border-border">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Card>

      {/* Booking Modal */}
      <BookingModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        booking={editingBooking}
        clients={clients}
        services={services}
        onSave={handleSaveBooking}
        selectedDate={selectedDate}
      />
    </div>
  );
}
