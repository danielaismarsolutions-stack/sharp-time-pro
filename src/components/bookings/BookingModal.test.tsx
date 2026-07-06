// The client picker was intentionally removed from the booking modal:
// creating an appointment must not offer any client search/selection, and
// editing shows the booking's client as read-only text only.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingModal from './BookingModal';
import type { Booking, Client } from '@/types';

vi.mock('@/services/supabaseBookings', () => ({
  supabaseBookingsApi: { getByDateRange: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/hooks/useStaffTerms', () => ({
  useStaffTerms: () => ({
    terminology: 'barberos',
    singular: 'barbero',
    singularCap: 'Barbero',
    plural: 'barberos',
    pluralCap: 'Barberos',
  }),
}));

const clients: Client[] = [
  {
    id: '1',
    name: 'Miguel García',
    phone: '615481969',
    email: '',
    notes: '',
    totalVisits: 0,
    totalSpent: 0,
    lastVisit: null,
    createdAt: '2026-01-01',
    tags: [],
  },
];

const baseProps = {
  open: true,
  onOpenChange: () => {},
  clients,
  services: [],
  barbers: [],
  onSave: async () => {},
};

const editedBooking: Booking = {
  id: 'b1',
  clientId: '1',
  clientName: 'Miguel García',
  clientPhone: '615481969',
  clientEmail: '',
  serviceId: 's1',
  serviceName: 'Corte',
  serviceDuration: 30,
  servicePrice: 15,
  date: '2026-07-10',
  time: '10:00',
  endTime: '10:30',
  status: 'confirmed',
  source: 'phone',
  notes: '',
  createdAt: '2026-07-01',
};

describe('BookingModal without client picker', () => {
  it('offers no client search or selection when creating', () => {
    render(<BookingModal {...baseProps} />);

    expect(screen.getByText('Nueva Cita')).toBeInTheDocument();
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument();
    expect(screen.queryByText('Buscar cliente...')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Buscar por nombre, teléfono...'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Crear nuevo cliente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear Cita' })).toBeInTheDocument();
  });

  it('shows the client read-only (no search) when editing', () => {
    render(<BookingModal {...baseProps} booking={editedBooking} />);

    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText(/Miguel García - 615481969/)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Buscar por nombre, teléfono...'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Buscar cliente...')).not.toBeInTheDocument();
  });
});
