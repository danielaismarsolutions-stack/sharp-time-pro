// Events must be creatable at any time of day: midnight, the last slot of the
// day (23:45 → 23:59), and off-grid times coming from 5-minute drag moves.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventModal from './EventModal';
import type { ApiCalendarEvent } from '@/types/api';

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

const baseProps = {
  open: true,
  onOpenChange: () => {},
  barbers: [],
  onSave: vi.fn().mockResolvedValue(undefined),
};

const fillNameAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText(/Reunión de equipo/), 'Inventario');
  await user.click(screen.getByRole('button', { name: 'Crear Evento' }));
};

describe('EventModal creation at any time of day', () => {
  it('creates an event starting at midnight (00:00 → 01:00)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <EventModal
        {...baseProps}
        onSave={onSave}
        selectedDate={new Date(2027, 0, 15)}
        selectedTime="00:00"
      />
    );

    await fillNameAndSubmit(user);

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '00:00', endTime: '01:00' })
    );
  });

  it('creates an event in the last slot of the day (23:45 → 23:59)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <EventModal
        {...baseProps}
        onSave={onSave}
        selectedDate={new Date(2027, 0, 15)}
        selectedTime="23:45"
      />
    );

    await fillNameAndSubmit(user);

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '23:45', endTime: '23:59' })
    );
  });

  it('ends at 23:59 when one hour past the start would pass midnight', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <EventModal
        {...baseProps}
        onSave={onSave}
        selectedDate={new Date(2027, 0, 15)}
        selectedTime="23:30"
      />
    );

    await fillNameAndSubmit(user);

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '23:30', endTime: '23:59' })
    );
  });

  it('respects an end time coming from a drag selection until end of day', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <EventModal
        {...baseProps}
        onSave={onSave}
        selectedDate={new Date(2027, 0, 15)}
        selectedTime="22:00"
        selectedEndTime="23:59"
      />
    );

    await fillNameAndSubmit(user);

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '22:00', endTime: '23:59' })
    );
  });
});

describe('EventModal editing preserves off-grid times', () => {
  it('keeps 5-minute drag times (e.g. 10:05 → 10:35) when re-saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const event: ApiCalendarEvent = {
      id: 'evt-1',
      business_id: 'biz-1',
      name: 'Formación',
      event_date: '2027-01-15',
      start_time: '10:05:00',
      end_time: '10:35:00',
      repeat: 'none',
      location: null,
      notes: null,
      barber: null,
      color: '',
      created_at: '2027-01-01T00:00:00Z',
      updated_at: '2027-01-01T00:00:00Z',
    };

    render(<EventModal {...baseProps} onSave={onSave} event={event} />);

    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '10:05', endTime: '10:35' })
    );
  });
});
