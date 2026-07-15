// Client assignment in the booking modal: when creating, a Clients-page-style
// search bar (plain input, filters as you type, best match first) lets the
// user optionally assign a client; when editing, the client is read-only.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingModal from './BookingModal';
import type { Booking, Client, Service } from '@/types';
import { DEFAULT_SCHEDULE, type Barber } from '@/types/barber';

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

const makeService = (id: string, name: string, overrides: Partial<Service> = {}): Service => ({
  id,
  name,
  description: '',
  duration: 30,
  price: 15,
  color: '#000000',
  isActive: true,
  bufferBefore: 0,
  bufferAfter: 0,
  isConsultation: false,
  ...overrides,
});

const makeBarber = (id: string, name: string): Barber => ({
  id,
  business_id: 'biz1',
  name,
  email: null,
  phone: null,
  avatar_url: null,
  bio: null,
  role: 'barber',
  schedule: DEFAULT_SCHEDULE,
  time_off: [],
  is_active: true,
  appointment_color: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

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

// Preselections used when creating from the client profile ("Nueva Cita"):
// client, last service and last barber come preselected, and the time picker
// is restricted to the barber's available slots.
describe('BookingModal preselections (create from client profile)', () => {
  const services = [makeService('s1', 'Corte'), makeService('s2', 'Afeitado', { isActive: false })];
  const barbers = [makeBarber('b1', 'Juan Barbero')];

  it('preselects client, service and barber, and picks an available time slot', async () => {
    render(
      <BookingModal
        {...baseProps}
        services={services}
        barbers={barbers}
        preselectedClientId="2"
        preselectedServiceId="s1"
        preselectedBarberId="b1"
      />
    );

    // Client chip replaces the search bar
    expect(screen.getByText(/Miguel García - 615481969/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
    // Service and barber selects show the preselected values
    expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Juan Barbero').length).toBeGreaterThan(0);
    // First available slot within the barber's schedule is auto-selected
    // (DEFAULT_SCHEDULE starts every working day at 09:00)
    await waitFor(() => {
      expect(screen.getAllByText('09:00').length).toBeGreaterThan(0);
    });
  });

  it('ignores an inactive preselected service', () => {
    render(
      <BookingModal
        {...baseProps}
        services={services}
        barbers={barbers}
        preselectedClientId="2"
        preselectedServiceId="s2"
        preselectedBarberId="b1"
      />
    );

    expect(screen.getAllByText('Selecciona un servicio').length).toBeGreaterThan(0);
    // Barber preselection still applies
    expect(screen.getAllByText('Juan Barbero').length).toBeGreaterThan(0);
  });

  it('drops the preselected barber when not assigned to the preselected service', () => {
    const restricted = [makeService('s1', 'Corte', { barberIds: ['other-barber'] })];
    render(
      <BookingModal
        {...baseProps}
        services={restricted}
        barbers={barbers}
        preselectedServiceId="s1"
        preselectedBarberId="b1"
      />
    );

    expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    // The barber select falls back to "Sin asignar" instead of Juan Barbero
    expect(screen.getAllByText('Sin asignar').length).toBeGreaterThan(0);
    expect(screen.queryByText('Juan Barbero')).not.toBeInTheDocument();
  });

  it('falls back to the search bar when the preselected client is unknown', () => {
    render(
      <BookingModal
        {...baseProps}
        services={services}
        barbers={barbers}
        preselectedClientId="missing-id"
      />
    );

    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });
});

// Inline client creation: a "Crear nuevo cliente" button (only when the
// parent provides onClientCreate) swaps the search bar for a small form;
// the created client gets auto-selected for the booking.
describe('BookingModal inline client creation', () => {
  it('hides the create button when onClientCreate is not provided', () => {
    render(<BookingModal {...baseProps} />);

    expect(screen.queryByText('Crear nuevo cliente')).not.toBeInTheDocument();
  });

  it('creates a client from the inline form and selects it', async () => {
    const user = userEvent.setup();
    const created = makeClient('99', 'Pedro Nuevo', '699111222');
    const onClientCreate = vi.fn().mockResolvedValue(created);
    const { rerender } = render(
      <BookingModal {...baseProps} onClientCreate={onClientCreate} />
    );

    await user.click(screen.getByText('Crear nuevo cliente'));

    await user.type(screen.getByPlaceholderText('Nombre completo *'), 'Pedro Nuevo');
    await user.type(screen.getByPlaceholderText('Teléfono *'), '699111222');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => {
      expect(onClientCreate).toHaveBeenCalledWith({
        name: 'Pedro Nuevo',
        phone: '699111222',
        email: '',
      });
    });

    // Parent appends the created client to the list (as Calendar.tsx does);
    // the modal then shows it as the selected chip.
    rerender(
      <BookingModal
        {...baseProps}
        clients={[...clients, created]}
        onClientCreate={onClientCreate}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/Pedro Nuevo - 699111222/)).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText('Nombre completo *')).not.toBeInTheDocument();
  });

  it('prefills the form name from the search query', async () => {
    const user = userEvent.setup();
    const onClientCreate = vi.fn();
    render(<BookingModal {...baseProps} onClientCreate={onClientCreate} />);

    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), 'Cliente Inexistente');
    await user.click(screen.getByText('Crear nuevo cliente'));

    expect(screen.getByPlaceholderText('Nombre completo *')).toHaveValue('Cliente Inexistente');
  });

  it('selects the existing client instead of creating a duplicate phone', async () => {
    const user = userEvent.setup();
    const onClientCreate = vi.fn();
    render(<BookingModal {...baseProps} onClientCreate={onClientCreate} />);

    await user.click(screen.getByText('Crear nuevo cliente'));
    await user.type(screen.getByPlaceholderText('Nombre completo *'), 'Otro Miguel');
    await user.type(screen.getByPlaceholderText('Teléfono *'), '615 481 969');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => {
      expect(screen.getByText(/Miguel García - 615481969/)).toBeInTheDocument();
    });
    expect(onClientCreate).not.toHaveBeenCalled();
  });

  it('does not create when required fields are missing', async () => {
    const user = userEvent.setup();
    const onClientCreate = vi.fn();
    render(<BookingModal {...baseProps} onClientCreate={onClientCreate} />);

    await user.click(screen.getByText('Crear nuevo cliente'));
    await user.type(screen.getByPlaceholderText('Nombre completo *'), 'Solo Nombre');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    expect(onClientCreate).not.toHaveBeenCalled();
    // The form stays open for the user to complete it
    expect(screen.getByPlaceholderText('Teléfono *')).toBeInTheDocument();
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
