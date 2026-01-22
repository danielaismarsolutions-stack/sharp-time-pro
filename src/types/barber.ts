// Barber Types

export interface BarberShift {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface BarberDaySchedule {
  enabled: boolean;
  shifts: BarberShift[];
}

export interface BarberSchedule {
  monday: BarberDaySchedule;
  tuesday: BarberDaySchedule;
  wednesday: BarberDaySchedule;
  thursday: BarberDaySchedule;
  friday: BarberDaySchedule;
  saturday: BarberDaySchedule;
  sunday: BarberDaySchedule;
}

export interface TimeOff {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason?: string;
}

export interface Barber {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  schedule: BarberSchedule;
  time_off: TimeOff[];
  is_active: boolean;
  booking_buffer_minutes?: number;  // Buffer time between appointments
  timezone?: string;                 // Barber's timezone
  created_at: string;
  updated_at: string;
}

export interface CreateBarberData {
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  schedule?: BarberSchedule;
  is_active?: boolean;
}

export interface UpdateBarberData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  schedule?: BarberSchedule;
  time_off?: TimeOff[];
  is_active?: boolean;
}

export const DEFAULT_SCHEDULE: BarberSchedule = {
  monday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
  tuesday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
  wednesday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
  thursday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
  friday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
  saturday: { enabled: true, shifts: [{ start: '09:00', end: '14:00' }] },
  sunday: { enabled: false, shifts: [] },
};

export const DAY_NAMES: Record<keyof BarberSchedule, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};
