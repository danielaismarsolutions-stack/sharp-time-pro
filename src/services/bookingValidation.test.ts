import { normalizeTime, validateEventData, timesOverlap } from './supabaseBookings';
import type { CreateEventBookingData } from './supabaseBookings';

describe('normalizeTime', () => {
  it('appends :00 to HH:mm format', () => {
    expect(normalizeTime('09:30')).toBe('09:30:00');
  });

  it('leaves HH:mm:ss format unchanged', () => {
    expect(normalizeTime('09:30:00')).toBe('09:30:00');
  });

  it('handles midnight', () => {
    expect(normalizeTime('00:00')).toBe('00:00:00');
  });
});

describe('timesOverlap', () => {
  it('detects overlapping intervals', () => {
    expect(timesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true);
  });

  it('detects when one interval contains the other', () => {
    expect(timesOverlap('09:00', '12:00', '10:00', '11:00')).toBe(true);
  });

  it('returns false for adjacent non-overlapping intervals', () => {
    expect(timesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
  });

  it('returns false for completely separate intervals', () => {
    expect(timesOverlap('09:00', '10:00', '14:00', '15:00')).toBe(false);
  });

  it('handles mixed HH:mm and HH:mm:ss formats', () => {
    expect(timesOverlap('09:00', '10:00:00', '09:30:00', '10:30')).toBe(true);
  });

  it('returns false for back-to-back intervals', () => {
    expect(timesOverlap('08:00', '09:00', '09:00', '10:00')).toBe(false);
  });

  it('returns true for identical intervals', () => {
    expect(timesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true);
  });
});

describe('validateEventData', () => {
  // Use a future date to avoid "past date" validation
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const validData: CreateEventBookingData = {
    event_name: 'Team Meeting',
    booking_date: futureDateStr,
    start_time: '09:00',
    end_time: '10:00',
  };

  it('returns null for valid event data', () => {
    expect(validateEventData(validData)).toBeNull();
  });

  it('rejects empty event name', () => {
    const result = validateEventData({ ...validData, event_name: '' });
    expect(result).toBe('El nombre del evento es requerido');
  });

  it('rejects whitespace-only event name', () => {
    const result = validateEventData({ ...validData, event_name: '   ' });
    expect(result).toBe('El nombre del evento es requerido');
  });

  it('rejects missing booking date', () => {
    const result = validateEventData({ ...validData, booking_date: '' });
    expect(result).toBe('La fecha es requerida');
  });

  it('rejects missing start time', () => {
    const result = validateEventData({ ...validData, start_time: '' });
    expect(result).toBe('Las horas de inicio y fin son requeridas');
  });

  it('rejects missing end time', () => {
    const result = validateEventData({ ...validData, end_time: '' });
    expect(result).toBe('Las horas de inicio y fin son requeridas');
  });

  it('rejects start time after end time', () => {
    const result = validateEventData({ ...validData, start_time: '14:00', end_time: '10:00' });
    expect(result).toBe('La hora de inicio debe ser anterior a la hora de fin');
  });

  it('rejects start time equal to end time', () => {
    const result = validateEventData({ ...validData, start_time: '10:00', end_time: '10:00' });
    expect(result).toBe('La hora de inicio debe ser anterior a la hora de fin');
  });

  it('rejects past dates', () => {
    const result = validateEventData({ ...validData, booking_date: '2020-01-01' });
    expect(result).toBe('No se pueden crear eventos en fechas pasadas');
  });

  it('accepts today as a valid date', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = validateEventData({ ...validData, booking_date: today });
    expect(result).toBeNull();
  });
});
