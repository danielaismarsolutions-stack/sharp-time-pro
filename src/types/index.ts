// Core data types for the barbershop management system

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type BookingSource = 'online' | 'phone' | 'walk-in';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  barberId?: string | null;
  barber?: string | null;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm format
  status: BookingStatus;
  source: BookingSource;
  notes: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  createdAt: string;
  tags: string[];
  avatar?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  color: string;
  isActive: boolean;
  bufferBefore: number;
  bufferAfter: number;
  sortOrder?: number;
  servicePhoto?: string | null;
  isConsultation: boolean;
  barberIds?: string[];
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  description: string;
}

export interface BusinessHoursShift {
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
}

export interface BusinessHours {
  [day: string]: {
    isOpen: boolean;
    shifts: BusinessHoursShift[];
  };
}

export interface BookingSettings {
  minAdvanceBooking: number; // hours
  maxAdvanceBooking: number; // days
  onlineBookingEnabled: boolean;
  cancellationPolicy: string;
}

export interface NotificationSettings {
  emailNewBooking: boolean;
  emailCancellation: boolean;
  emailReminder: boolean;
  reminderTiming: number; // hours before
  smsEnabled: boolean;
}

export interface AnalyticsData {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    byService: { name: string; revenue: number }[];
    trend: { date: string; revenue: number }[];
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    busiestHours: { hour: number; count: number }[];
    busiestDays: { day: string; count: number }[];
  };
  clients: {
    total: number;
    newThisMonth: number;
    returning: number;
    topClients: { id: string; name: string; revenue: number; visits: number }[];
    retentionRate: number;
  };
}

export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  name: string;
  date: string; // ISO format YYYY-MM-DD
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  repeat: EventRepeat;
  location: string;
  notes: string;
  barber: string | null;
  color: string; // hex color for the event card
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'barber' | 'admin';
}
