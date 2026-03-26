// API Types
// TypeScript interfaces for API requests and responses

// ==================== API Response Wrapper ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// ==================== Booking Types ====================

export type ApiBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type ApiBookingSource = 'online' | 'phone' | 'walk_in';
export type ApiPaymentStatus = 'unpaid' | 'paid';
export type ApiPaymentMethod = 'cash' | 'card' | 'bizum';

export type ApiBookingType = 'booking' | 'event';

export interface ApiBooking {
  id: string;
  business_id: string;
  client_id: string | null;
  service_id: string | null;
  user_id: string | null;
  booking_date: string; // ISO date format (YYYY-MM-DD)
  start_time: string; // HH:mm:ss format
  end_time: string; // HH:mm:ss format
  status: ApiBookingStatus;
  source: ApiBookingSource;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  service_duration: number; // minutes
  service_price: number; // decimal
  barber: string | null; // barber handling the booking
  notes: string | null;
  cancellation_reason: string | null;
  reminder_sent_at: string | null;
  payment_status: ApiPaymentStatus;
  payment_method: ApiPaymentMethod | null;
  paid_at: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  // Event-specific columns (populated when booking_type = 'event')
  booking_type?: ApiBookingType;
  event_name?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: Record<string, unknown> | null;
  location?: string | null;
  color?: string | null;
}

// ==================== Client Types (Future) ====================

export interface ApiClient {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ==================== Service Types (Future) ====================

export interface ApiService {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  color: string;
  is_active: boolean;
  buffer_before: number;
  buffer_after: number;
  is_consultation: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== Request Params ====================

export interface BookingsQueryParams {
  date?: string;
  status?: ApiBookingStatus;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateBookingRequest {
  client_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  notes?: string;
}

export interface UpdateBookingRequest {
  booking_date?: string;
  start_time?: string;
  status?: ApiBookingStatus;
  notes?: string;
  cancellation_reason?: string;
}

// ==================== Calendar Event Types ====================

export type ApiEventRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

export interface ApiCalendarEvent {
  id: string;
  business_id: string;
  name: string;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  repeat: ApiEventRepeat;
  location: string | null;
  notes: string | null;
  barber: string | null;
  color: string; // hex color
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  repeat?: ApiEventRepeat;
  location?: string;
  notes?: string;
  barber?: string | null;
  color?: string;
}

export interface UpdateEventRequest {
  name?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  repeat?: ApiEventRepeat;
  location?: string;
  notes?: string;
  barber?: string | null;
  color?: string;
}
