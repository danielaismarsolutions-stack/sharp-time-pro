// Barber types for the barbershop management system

export interface Shift {
  start: string; // "09:00"
  end: string; // "18:00"
}

export interface DaySchedule {
  enabled: boolean;
  shifts: Shift[];
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export type DayOfWeek = keyof WeekSchedule;

export interface TimeOff {
  id: string;
  startDate: string;
  endDate: string;
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
  schedule: WeekSchedule;
  time_off: TimeOff[];
  is_active: boolean;
  accepts_online_bookings: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type NewBarber = Omit<Barber, 'id' | 'created_at' | 'updated_at' | 'business_id' | 'display_order' | 'time_off'>;

export const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { enabled: true, shifts: [{ start: '09:00', end: '18:00' }] },
  tuesday: { enabled: true, shifts: [{ start: '09:00', end: '18:00' }] },
  wednesday: { enabled: true, shifts: [{ start: '09:00', end: '18:00' }] },
  thursday: { enabled: true, shifts: [{ start: '09:00', end: '18:00' }] },
  friday: { enabled: true, shifts: [{ start: '09:00', end: '18:00' }] },
  saturday: { enabled: true, shifts: [{ start: '10:00', end: '14:00' }] },
  sunday: { enabled: false, shifts: [] },
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const DAYS_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
