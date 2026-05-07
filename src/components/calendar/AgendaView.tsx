import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { Service } from '@/types';
import { cn } from '@/lib/utils';
import { getBarberPastelColorByName, getBarberHexColor, DEFAULT_EVENT_HEX, useBarberColorVersion } from './shared/colorUtils';

interface AgendaViewProps {
  currentDate: Date;
  bookings: ApiBooking[];
  services: Service[];
  barberNames: string[];
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
  barberNames,
  onBookingClick,
  getEventsForDay,
  onEventClick,
}: AgendaViewProps) {
  // Subscribe to per-barber color overrides so the cards re-render when
  // an admin changes a barber's color.
  useBarberColorVersion();
  // Group bookings by day starting from the selected day (7 days total)
  const dayGroups = useMemo<DayGroup[]>(() => {
    const days: DayGroup[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(currentDate, i);
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

  // Calculate income for the 7-day window starting from selected day
  const weeklyIncome = useMemo(() => {
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      format(addDays(currentDate, i), 'yyyy-MM-dd')
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
        className="flex-shrink-0 bg-card border-t border-border px-4 py-3 flex items-center justify-between md:hidden"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-sm">Ingresos de los próximos 7 días</span>
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

  const barberName = booking.barber || '';
  const colors = getBarberPastelColorByName(barberName);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg p-3 px-4 transition-all',
        'border-l-4',
        colors.bg,
        colors.border,
        colors.hover,
        'active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      style={{ borderRadius: '8px' }}
    >
      <p className={cn('text-sm', colors.text)}>
        <span className="font-semibold">{booking.client_name}</span>
        {booking.service_name && (
          <span className="font-normal"> {booking.service_name}</span>
        )}
      </p>
      <p className={cn('text-xs mt-0.5 opacity-70', colors.text)}>
        {timeRange}{barberName && ` · ${barberName}`}
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
  const eventHex = event.color
    || (event.barber ? getBarberHexColor(event.barber) : DEFAULT_EVENT_HEX);

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
        borderLeftColor: eventHex,
        backgroundColor: eventHex + '33',
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
