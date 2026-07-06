// Client assignment in the booking modal: when creating, a Clients-page-style
// search bar (plain input, filters as you type, best match first) lets the
// user optionally assign a client; when editing, the client is read-only.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const makeClient = (id: string, name: string, phone: string): Client => ({
  id,
  name,
  phone,
  email: '',
  notes: '',
  totalVisits: 0,
  totalSpent: 0,
  lastVisit: null,
  createdAt: '2026-01-01',
  tags: [],
});

const clients = [
  makeClient('1', 'Miguel Fernández Narciso', '629037597'),
  makeClient('2', 'Miguel García', '615481969'),
  makeClient('3', 'Alfredo Pérez', '617650912'),
];

const baseProps = {
  open: true,
  onOpenChange: () => {},
  clients,
  services: [],
  barbers: [],
  onSave: async () => {},
};

const SEARCH_PLACEHOLDER = 'Buscar por nombre, teléfono, email o etiqueta...';

describe('BookingModal client assignment (create)', () => {
  it('shows the Clients-page-style search bar and no results until typing', () => {
    render(<BookingModal {...baseProps} />);

    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    // No client list rendered while the query is empty
    expect(screen.queryByText('Miguel García')).not.toBeInTheDocument();
  });

  it('filters by name as the user types and assigns on click', async () => {
    const user = userEvent.setup();
    render(<BookingModal {...baseProps} />);

    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), 'Alfr');
    await waitFor(() => {
      expect(screen.getByText('Alfredo Pérez')).toBeInTheDocument();
      expect(screen.queryByText('Miguel García')).not.toBeInTheDocument();
    });

    await user.click(screen.getByText('Alfredo Pérez'));
    // Selected chip replaces the search input
    expect(screen.getByText(/Alfredo Pérez - 617650912/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();

    // The X clears the selection and brings the search back
    await user.click(screen.getByRole('button', { name: 'Quitar cliente' }));
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });

  it('filters by phone without country prefix', async () => {
    const user = userEvent.setup();
    render(<BookingModal {...baseProps} />);

    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), '615 481');
    await waitFor(() => {
      expect(screen.getByText('Miguel García')).toBeInTheDocument();
      expect(screen.queryByText('Alfredo Pérez')).not.toBeInTheDocument();
    });
  });

  it('shows the empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<BookingModal {...baseProps} />);

    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), 'zzz');
    await waitFor(() => {
      expect(screen.getByText('No se encontraron clientes')).toBeInTheDocument();
    });
  });
});

describe('BookingModal client display (edit)', () => {
  const editedBooking: Booking = {
    id: 'b1',
    clientId: '2',
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

  it('shows the client read-only without a search bar', () => {
    render(<BookingModal {...baseProps} booking={editedBooking} />);

    expect(screen.getByText(/Miguel García - 615481969/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
  });
});
