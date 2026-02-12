import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';

interface AgendaViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  onBookingClick: (booking: ApiBooking) => void;
  getEventsForDay?: (date: Date) => ApiCalendarEvent[];
  onEventClick?: (event: ApiCalendarEvent) => void;
}

interface DayGroup {
  date: Date;
  dateStr: string;
  bookings: ApiBooking[];
}

// Format time to 12-hour format like "11:15AM"
function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Format date header in Spanish
function formatDateHeader(date: Date): string {
  // "Lunes, 2 de febrero" format
  return format(date, "EEEE, d 'de' MMMM", { locale: es });
}

export function AgendaView({
  currentDate,
  bookings,
  services,
  onBookingClick,
  getEventsForDay,
  onEventClick,
}: AgendaViewProps) {
  // Group bookings by day for the selected week
  const dayGroups = useMemo<DayGroup[]>(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days: DayGroup[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayBookings = bookings
        .filter((b) => b.booking_date === dateStr && b.status !== 'cancelled')
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      days.push({
        date,
        dateStr,
        bookings: dayBookings,
      });
    }

    return days;
  }, [currentDate, bookings]);

  // Calculate weekly income from completed bookings
  const weeklyIncome = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      format(addDays(start, i), 'yyyy-MM-dd')
    );

    return bookings
      .filter((b) =>
        weekDates.includes(b.booking_date) &&
        (b.status === 'completed' || b.status === 'confirmed')
      )
      .reduce((sum, b) => sum + (b.service_price || 0), 0);
  }, [currentDate, bookings]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable day list */}
      <div className="flex-1 overflow-auto min-h-0">
        {dayGroups.map((group) => (
          <div key={group.dateStr} className="px-4 py-3">
            {/* Date Header */}
            <h3 className="text-base font-normal text-foreground capitalize mb-3">
              {formatDateHeader(group.date)}
            </h3>

            {/* Appointments & Events or Empty State */}
            {group.bookings.length === 0 && (!getEventsForDay || getEventsForDay(group.date).length === 0) ? (
              <p className="text-sm text-muted-foreground italic pl-1">
                Nada planificado
              </p>
            ) : (
              <div className="space-y-2">
                {group.bookings.map((booking) => (
                  <AgendaAppointmentCard
                    key={booking.id}
                    booking={booking}
                    onClick={() => onBookingClick(booking)}
                  />
                ))}
                {getEventsForDay && onEventClick && getEventsForDay(group.date).map((event) => (
                  <AgendaEventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Weekly Income Section - static at bottom of agenda, not fixed */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between md:hidden"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-sm">Ingresos de esta semana</span>
        </div>
        <span className="text-base font-semibold text-foreground">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
          }).format(weeklyIncome)}
        </span>
      </div>
    </div>
  );
}

interface AgendaAppointmentCardProps {
  booking: ApiBooking;
  onClick: () => void;
}

function AgendaAppointmentCard({ booking, onClick }: AgendaAppointmentCardProps) {
  const timeRange = `${formatTime12h(booking.start_time)} - ${formatTime12h(booking.end_time)}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg p-3 px-4 transition-all',
        'border-l-4 border-l-[#10B981]', // mint/teal accent
        'bg-[#D1FAE5]', // soft mint background
        'hover:bg-[#A7F3D0] active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      style={{ borderRadius: '8px' }}
    >
      {/* Line 1: Client name (bold) + service name */}
      <p className="text-sm text-gray-800">
        <span className="font-semibold">{booking.client_name}</span>
        {booking.service_name && (
          <span className="font-normal"> {booking.service_name}</span>
        )}
      </p>

      {/* Line 2: Time range */}
      <p className="text-xs text-gray-600 mt-0.5">
        {timeRange}
      </p>
    </button>
  );
}

// Event card for agenda view
interface AgendaEventCardProps {
  event: ApiCalendarEvent;
  onClick: () => void;
}

function AgendaEventCard({ event, onClick }: AgendaEventCardProps) {
  const timeRange = `${formatTime12h(event.start_time)} - ${formatTime12h(event.end_time)}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg p-3 px-4 transition-all',
        'border-l-4',
        'hover:brightness-95 active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      style={{
        borderRadius: '8px',
        borderLeftColor: event.color || '#d1d5db',
        backgroundColor: (event.color || '#d1d5db') + '33',
      }}
    >
      <p className="text-sm text-gray-800">
        <span className="font-semibold">{event.name}</span>
        {event.location && (
          <span className="font-normal text-gray-600"> - {event.location}</span>
        )}
      </p>
      <p className="text-xs text-gray-600 mt-0.5">
        {timeRange}
      </p>
    </button>
  );
}
