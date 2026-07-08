// Tests for the pure validation/snapping helpers used by calendar drag-and-drop
import { describe, it, expect } from 'vitest';
import {
  DRAG_SNAP_MINUTES,
  snapToDragInterval,
  calculateTimeFromY,
  isWithinBusinessHours,
  checkClosureDate,
  checkBusinessSchedule,
  checkBarberSchedule,
  checkConflicts,
} from './useCalendarDragDropEnhanced';
import type { Barber } from '@/types/barber';
import type { BusinessHours, ClosureDate } from '@/types';
import type { ApiBooking } from '@/types/api';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const emptyDay = { enabled: false, shifts: [] };

const makeBarber = (overrides: Partial<Barber> = {}): Barber => ({
  id: 'b1',
  business_id: 'biz1',
  name: 'Juan',
  email: null,
  phone: null,
  avatar_url: null,
  bio: null,
  role: 'barber',
  schedule: {
    monday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
    tuesday: { enabled: true, shifts: [{ start: '09:00', end: '20:00' }] },
    wednesday: { enabled: true, shifts: [{ start: '09:00', end: '20:00' }] },
    thursday: { enabled: true, shifts: [{ start: '09:00', end: '20:00' }] },
    friday: { enabled: true, shifts: [{ start: '09:00', end: '20:00' }] },
    saturday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }] },
    sunday: emptyDay,
  },
  time_off: [],
  is_active: true,
  appointment_color: null,
  created_at: '',
  updated_at: '',
  ...overrides,
});

const businessHours: BusinessHours = {
  monday: { isOpen: true, shifts: [{ openTime: '09:00', closeTime: '14:00' }, { openTime: '16:00', closeTime: '21:00' }] },
  tuesday: { isOpen: true, shifts: [{ openTime: '09:00', closeTime: '21:00' }] },
  wednesday: { isOpen: true, shifts: [{ openTime: '09:00', closeTime: '21:00' }] },
  thursday: { isOpen: true, shifts: [{ openTime: '09:00', closeTime: '21:00' }] },
  friday: { isOpen: true, shifts: [{ openTime: '09:00', closeTime: '21:00' }] },
  saturday: { isOpen: true, shifts: [{ openTime: '09:00', closeTime: '14:00' }] },
  sunday: { isOpen: false, shifts: [] },
};

const makeBooking = (overrides: Partial<ApiBooking> = {}): ApiBooking => ({
  id: 'bk1',
  booking_date: '2026-07-06',
  start_time: '10:00:00',
  end_time: '10:30:00',
  client_name: 'Cliente',
  service_name: 'Corte',
  barber: 'Juan',
  status: 'confirmed',
  ...overrides,
} as ApiBooking);

// 2026-07-06 is a Monday, 2026-07-12 is a Sunday.

// ---------------------------------------------------------------------------
// Snapping (5-minute intervals)
// ---------------------------------------------------------------------------

describe('snapToDragInterval', () => {
  it('uses a 5-minute granularity', () => {
    expect(DRAG_SNAP_MINUTES).toBe(5);
  });

  it('snaps to the nearest 5-minute mark', () => {
    expect(snapToDragInterval(0)).toBe(0);
    expect(snapToDragInterval(2)).toBe(0);
    expect(snapToDragInterval(3)).toBe(5);
    expect(snapToDragInterval(7)).toBe(5);
    expect(snapToDragInterval(8)).toBe(10);
    expect(snapToDragInterval(12.4)).toBe(10);
    expect(snapToDragInterval(12.5)).toBe(15);
    expect(snapToDragInterval(58)).toBe(60);
  });

  it('produces every 5-minute step within an hour (not just quarters)', () => {
    const snapped = new Set(
      Array.from({ length: 61 }, (_, m) => snapToDragInterval(m))
    );
    expect([...snapped].sort((a, b) => a - b)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  });
});

describe('calculateTimeFromY', () => {
  it('converts Y pixels to 5-min-snapped times', () => {
    // 120px per hour → 2px per minute; y=14px → 7min → snaps to 5
    expect(calculateTimeFromY(14, 120, 8).timeString).toBe('08:05');
    expect(calculateTimeFromY(0, 120, 8).timeString).toBe('08:00');
    expect(calculateTimeFromY(130, 120, 8).timeString).toBe('09:05');
  });

  it('allows late-evening hours up to 23', () => {
    // 14 hours down from 8 → 22:00
    expect(calculateTimeFromY(14 * 120, 120, 8).timeString).toBe('22:00');
  });
});

// ---------------------------------------------------------------------------
// Business schedule (barbershop hours)
// ---------------------------------------------------------------------------

describe('checkBusinessSchedule', () => {
  it('accepts a booking inside an open shift', () => {
    expect(checkBusinessSchedule(businessHours, '2026-07-06', '10:00', '10:30').isWithin).toBe(true);
    expect(checkBusinessSchedule(businessHours, '2026-07-06', '16:00', '21:00').isWithin).toBe(true);
  });

  it('warns when the booking falls in the gap between split shifts', () => {
    const result = checkBusinessSchedule(businessHours, '2026-07-06', '14:30', '15:00');
    expect(result.isWithin).toBe(false);
    expect(result.reason).toContain('Fuera del horario del negocio');
    expect(result.reason).toContain('09:00-14:00');
    expect(result.reason).toContain('16:00-21:00');
  });

  it('warns when the booking merely overflows the closing time', () => {
    const result = checkBusinessSchedule(businessHours, '2026-07-06', '20:45', '21:15');
    expect(result.isWithin).toBe(false);
  });

  it('warns on a closed day (Sunday)', () => {
    const result = checkBusinessSchedule(businessHours, '2026-07-12', '10:00', '10:30');
    expect(result.isWithin).toBe(false);
    expect(result.reason).toBe('El negocio no abre este día');
  });

  it('falls back to flat open/close hours when no business hours are loaded', () => {
    expect(checkBusinessSchedule(undefined, '2026-07-06', '10:00', '10:30', 9, 21).isWithin).toBe(true);
    expect(checkBusinessSchedule(undefined, '2026-07-06', '08:00', '08:30', 9, 21).isWithin).toBe(false);
    expect(checkBusinessSchedule(undefined, '2026-07-06', '20:45', '21:15', 9, 21).isWithin).toBe(false);
  });

  it('handles HH:mm:ss times', () => {
    expect(checkBusinessSchedule(businessHours, '2026-07-06', '10:00:00', '10:30:00').isWithin).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Closure dates (holidays)
// ---------------------------------------------------------------------------

describe('checkClosureDate', () => {
  const closures: ClosureDate[] = [
    { id: 'c1', date: '2026-07-06', name: 'Festivo local', isClosed: true },
    { id: 'c2', date: '2026-07-07', name: null, isClosed: false },
  ];

  it('flags closed holidays with their name', () => {
    const result = checkClosureDate(closures, '2026-07-06');
    expect(result.isClosed).toBe(true);
    expect(result.reason).toContain('Festivo local');
  });

  it('ignores non-closing dates and other days', () => {
    expect(checkClosureDate(closures, '2026-07-07').isClosed).toBe(false);
    expect(checkClosureDate(closures, '2026-07-08').isClosed).toBe(false);
    expect(checkClosureDate(undefined, '2026-07-06').isClosed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Barber schedule + vacations
// ---------------------------------------------------------------------------

describe('checkBarberSchedule', () => {
  it('accepts a booking inside the barber shift', () => {
    const result = checkBarberSchedule([makeBarber()], 'Juan', '2026-07-06', '09:00', '09:30');
    expect(result.isAvailable).toBe(true);
  });

  it('warns in the gap between the barber split shifts', () => {
    const result = checkBarberSchedule([makeBarber()], 'Juan', '2026-07-06', '14:30', '15:00');
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toContain('Fuera del horario de Juan');
  });

  it('warns on the barber day off', () => {
    // Sunday disabled
    const result = checkBarberSchedule([makeBarber()], 'Juan', '2026-07-12', '10:00', '10:30');
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toBe('Juan no trabaja este día');
  });

  it('detects vacations by string date comparison, inclusive on both ends', () => {
    const barber = makeBarber({
      time_off: [{ id: 't1', start_date: '2026-07-06', end_date: '2026-07-08', reason: 'Vacaciones' }],
    });
    for (const date of ['2026-07-06', '2026-07-07', '2026-07-08']) {
      const result = checkBarberSchedule([barber], 'Juan', date, '10:00', '10:30');
      expect(result.isAvailable).toBe(false);
      expect(result.reason).toContain('tiene el día libre');
      expect(result.reason).toContain('Vacaciones');
    }
    // Day after the vacation ends is available again
    expect(checkBarberSchedule([barber], 'Juan', '2026-07-09', '10:00', '10:30').isAvailable).toBe(true);
  });

  it('uses the local day of week (no UTC off-by-one)', () => {
    // 2026-07-06 must resolve to Monday in every timezone; the Monday
    // morning shift starts at 09:00, so 08:00 is out and 09:00 is in.
    expect(checkBarberSchedule([makeBarber()], 'Juan', '2026-07-06', '08:00', '08:30').isAvailable).toBe(false);
    expect(checkBarberSchedule([makeBarber()], 'Juan', '2026-07-06', '09:00', '09:30').isAvailable).toBe(true);
  });

  it('allows the move when no barber is assigned or the barber is unknown', () => {
    expect(checkBarberSchedule([makeBarber()], null, '2026-07-06', '10:00', '10:30').isAvailable).toBe(true);
    expect(checkBarberSchedule([makeBarber()], 'Desconocido', '2026-07-06', '10:00', '10:30').isAvailable).toBe(true);
  });

  it('tolerates barbers with missing schedule data', () => {
    const barber = makeBarber({ schedule: undefined as unknown as Barber['schedule'], time_off: undefined as unknown as Barber['time_off'] });
    const result = checkBarberSchedule([barber], 'Juan', '2026-07-06', '10:00', '10:30');
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toBe('Juan no trabaja este día');
  });
});

// ---------------------------------------------------------------------------
// Conflicts (still blocking)
// ---------------------------------------------------------------------------

describe('checkConflicts', () => {
  it('blocks overlaps with the same barber', () => {
    const other = makeBooking({ id: 'bk2', start_time: '10:15:00', end_time: '10:45:00' });
    const result = checkConflicts([other], 'bk1', '2026-07-06', '10:00', '10:30', 'Juan');
    expect(result.hasConflict).toBe(true);
  });

  it('allows overlaps with a different barber and ignores cancelled bookings', () => {
    const otherBarber = makeBooking({ id: 'bk2', barber: 'Pedro' });
    const cancelled = makeBooking({ id: 'bk3', status: 'cancelled' });
    const result = checkConflicts([otherBarber, cancelled], 'bk1', '2026-07-06', '10:00', '10:30', 'Juan');
    expect(result.hasConflict).toBe(false);
  });

  it('supports 5-minute offsets', () => {
    const other = makeBooking({ id: 'bk2', start_time: '10:00:00', end_time: '10:30:00' });
    // Ends exactly when the other starts → no conflict
    expect(checkConflicts([other], 'bk1', '2026-07-06', '09:30', '10:00', 'Juan').hasConflict).toBe(false);
    // 5-minute overlap → conflict
    expect(checkConflicts([other], 'bk1', '2026-07-06', '09:35', '10:05', 'Juan').hasConflict).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Flat business-hours helper (still used for grid shading fallbacks)
// ---------------------------------------------------------------------------

describe('isWithinBusinessHours', () => {
  it('is inclusive of opening and exclusive of closing hour', () => {
    expect(isWithinBusinessHours(9, 9, 21)).toBe(true);
    expect(isWithinBusinessHours(20, 9, 21)).toBe(true);
    expect(isWithinBusinessHours(21, 9, 21)).toBe(false);
    expect(isWithinBusinessHours(8, 9, 21)).toBe(false);
  });
});
