// Regression test for the client search inside the booking modal ("Nueva
// Cita"): typing in the search box must filter the client list by name
// (accent-insensitive) and by phone (prefix/format tolerant), best match first.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingModal from './BookingModal';
import type { Client } from '@/types';

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
vi.mock('@/components/clients/ClientModal', () => ({ default: () => null }));

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
  makeClient('3', 'Alfredo Pérez', '600111222'),
];

const renderModal = () =>
  render(
    <BookingModal
      open
      onOpenChange={() => {}}
      clients={clients}
      services={[]}
      barbers={[]}
      onSave={async () => {}}
    />,
  );

const openClientSearch = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText('Buscar cliente...'));
  return screen.getByPlaceholderText('Buscar por nombre, teléfono...');
};

const clientList = () => screen.getByText('Clientes').parentElement as HTMLElement;

beforeAll(() => {
  // cmdk calls scrollIntoView when highlighting items; happy-dom lacks it.
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe('BookingModal client search', () => {
  it('filters the list by name as the user types', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = await openClientSearch(user);

    await user.type(input, 'Alfr');

    await waitFor(() => {
      const list = clientList();
      expect(within(list).getByText('Alfredo Pérez')).toBeInTheDocument();
      expect(within(list).queryByText('Miguel García')).not.toBeInTheDocument();
      expect(within(list).queryByText('Miguel Fernández Narciso')).not.toBeInTheDocument();
    });
  });

  it('filters by phone without country prefix', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = await openClientSearch(user);

    await user.type(input, '615 481');

    await waitFor(() => {
      const list = clientList();
      expect(within(list).getByText('Miguel García')).toBeInTheDocument();
      expect(within(list).queryByText('Alfredo Pérez')).not.toBeInTheDocument();
    });
  });

  it('shows the empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = await openClientSearch(user);

    await user.type(input, 'zzz');

    await waitFor(() => {
      expect(screen.getByText('No se encontraron clientes')).toBeInTheDocument();
    });
  });
});
