// Supabase Bookings API Service
// Handles all booking-related operations with Supabase

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { ApiBooking, ApiBookingStatus, ApiBookingSource, ApiBookingType, ApiPaymentStatus, ApiPaymentMethod } from '@/types/api';

// ==================== Types ====================

export interface DbBooking {
  id: string;
  business_id: string;
  client_id: string | null;
  service_id: string | null;
  user_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: ApiBookingStatus;
  source: ApiBookingSource;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  service_duration: number;
  service_price: number;
  barber: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  payment_status: ApiPaymentStatus;
  payment_method: ApiPaymentMethod | null;
  paid_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  // Event-specific columns
  booking_type?: ApiBookingType;
  event_name?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: Record<string, unknown> | null;
  location?: string | null;
  color?: string | null;
}

export interface CreateBookingData {
  client_id: string;
  service_id: string;
  user_id?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status?: ApiBookingStatus;
  source?: ApiBookingSource;
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  service_name: string;
  service_duration: number;
  service_price: number;
  barber?: string | null;
  notes?: string | null;
  payment_status?: ApiPaymentStatus;
  payment_method?: ApiPaymentMethod | null;
  paid_at?: string | null;
}

export interface UpdateBookingData {
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  status?: ApiBookingStatus;
  notes?: string | null;
  cancellation_reason?: string | null;
  user_id?: string | null;
  barber?: string | null;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string | null;
  service_id?: string;
  service_name?: string;
  service_duration?: number;
  service_price?: number;
  payment_status?: ApiPaymentStatus;
  payment_method?: ApiPaymentMethod | null;
  paid_at?: string | null;
}

export interface BookingFilters {
  date?: string;
  status?: ApiBookingStatus;
  client_id?: string;
  start_date?: string;
  end_date?: string;
  barber?: string;
}

// ==================== Helper Functions ====================

// Headers are now fetched dynamically to include the authenticated user's JWT

// Map DB booking to API booking (no transformation needed, same structure)
const mapDbToApiBooking = (dbBooking: DbBooking): ApiBooking => dbBooking;

// ==================== Bookings API ====================

export const supabaseBookingsApi = {
  /**
   * Fetch all bookings with optional filters.
   * Uses Supabase pagination (Range header) to avoid the default 1000-row cap
   * and the old blanket limit=10000 that would silently drop data.
   */
  getAll: async (filters?: BookingFilters): Promise<ApiBooking[]> => {
    const PAGE_SIZE = 1000;
    let allRows: DbBooking[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${SUPABASE_CONFIG.url}/rest/v1/bookings`);

      // Always filter by business_id
      url.searchParams.append('business_id', `eq.${getBusinessId()}`);

      // Apply filters
      if (filters?.date) {
        url.searchParams.append('booking_date', `eq.${filters.date}`);
      }
      if (filters?.status) {
        url.searchParams.append('status', `eq.${filters.status}`);
      }
      if (filters?.client_id) {
        url.searchParams.append('client_id', `eq.${filters.client_id}`);
      }
      if (filters?.start_date && filters?.end_date) {
        url.searchParams.append('booking_date', `gte.${filters.start_date}`);
        url.searchParams.append('booking_date', `lte.${filters.end_date}`);
      } else if (filters?.start_date) {
        url.searchParams.append('booking_date', `gte.${filters.start_date}`);
      } else if (filters?.end_date) {
        url.searchParams.append('booking_date', `lte.${filters.end_date}`);
      }
      if (filters?.barber) {
        url.searchParams.append('barber', `eq.${filters.barber}`);
      }

      // Order by date and time
      url.searchParams.append('order', 'booking_date.asc,start_time.asc');

      const headers = await getAuthHeaders();
      // Use Range header for proper pagination instead of limit param
      const rangeEnd = offset + PAGE_SIZE - 1;
      const response = await fetch(url.toString(), {
        headers: {
          ...headers,
          'Range-Unit': 'items',
          'Range': `${offset}-${rangeEnd}`,
          'Prefer': 'count=exact',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Failed to fetch bookings');
      }

      const page: DbBooking[] = await response.json();
      allRows = allRows.concat(page);

      // Check if there are more pages
      // Supabase returns Content-Range: 0-999/1234 or */0
      const contentRange = response.headers.get('Content-Range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        const total = match ? parseInt(match[1], 10) : 0;
        hasMore = allRows.length < total;
      } else {
        // Fallback: if we got a full page, there might be more
        hasMore = page.length === PAGE_SIZE;
      }

      offset += PAGE_SIZE;
    }

    return allRows.map(mapDbToApiBooking);
  },

  /**
   * Fetch a specific booking by ID
   */
  getById: async (bookingId: string): Promise<ApiBooking | null> => {
    const url = new URL(`${SUPABASE_CONFIG.url}/rest/v1/bookings`);
    url.searchParams.append('id', `eq.${bookingId}`);
    url.searchParams.append('business_id', `eq.${getBusinessId()}`);
    
    const headers = await getAuthHeaders();
    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error('Failed to fetch booking');
    }
    
    const data: DbBooking[] = await response.json();
    
    if (data.length === 0) {
      return null;
    }
    
    return mapDbToApiBooking(data[0]);
  },

  /**
   * Create a new booking
   */
  create: async (bookingData: CreateBookingData): Promise<ApiBooking> => {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings`;
    
    const payload = {
      business_id: getBusinessId(),
      ...bookingData,
      status: bookingData.status || 'confirmed',
      source: bookingData.source || 'phone',
    };
    

    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Failed to create booking');
    }
    
    const data: DbBooking[] = await response.json();
    
    return mapDbToApiBooking(data[0]);
  },

  /**
   * Update an existing booking
   */
  update: async (bookingId: string, updates: UpdateBookingData): Promise<ApiBooking> => {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings?id=eq.${bookingId}&business_id=eq.${getBusinessId()}`;
    
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    

    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Failed to update booking');
    }
    
    const data: DbBooking[] = await response.json();
    
    if (data.length === 0) {
      throw new Error('Booking not found');
    }
    
    
    return mapDbToApiBooking(data[0]);
  },

  /**
   * Delete a booking (hard delete)
   */
  delete: async (bookingId: string): Promise<void> => {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings?id=eq.${bookingId}&business_id=eq.${getBusinessId()}`;
    

    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Failed to delete booking');
    }
    
  },

  /**
   * Update booking status
   */
  updateStatus: async (bookingId: string, status: ApiBookingStatus, cancellationReason?: string): Promise<ApiBooking> => {
    const updates: UpdateBookingData = { status };
    
    if (status === 'cancelled' && cancellationReason) {
      updates.cancellation_reason = cancellationReason;
    }
    
    return supabaseBookingsApi.update(bookingId, updates);
  },

  /**
   * Update payment info for a booking
   */
  updatePayment: async (bookingId: string, paymentMethod: ApiPaymentMethod): Promise<ApiBooking> => {
    return supabaseBookingsApi.update(bookingId, {
      payment_status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    });
  },

  /**
   * Clear payment info for a booking
   */
  clearPayment: async (bookingId: string): Promise<ApiBooking> => {
    return supabaseBookingsApi.update(bookingId, {
      payment_status: 'unpaid',
      payment_method: null,
      paid_at: null,
    });
  },

  /**
   * Get bookings for a date range (useful for calendar views)
   */
  getByDateRange: async (startDate: string, endDate: string): Promise<ApiBooking[]> => {
    return supabaseBookingsApi.getAll({ start_date: startDate, end_date: endDate });
  },

  /**
   * Get bookings for a specific client
   */
  getByClient: async (clientId: string): Promise<ApiBooking[]> => {
    return supabaseBookingsApi.getAll({ client_id: clientId });
  },
};

// ==================== Event Booking Types ====================

export interface CreateEventBookingData {
  event_name: string;
  booking_date: string;
  start_time: string; // HH:mm or HH:mm:ss
  end_time: string;   // HH:mm or HH:mm:ss
  user_id?: string | null;   // barber_id
  barber?: string | null;    // barber display name
  location?: string | null;
  notes?: string | null;
  color?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: Record<string, unknown> | null;
}

export interface UpdateEventBookingData {
  event_name?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  user_id?: string | null;
  barber?: string | null;
  location?: string | null;
  notes?: string | null;
  color?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: Record<string, unknown> | null;
}

// ==================== Validation ====================

export function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function validateEventData(data: CreateEventBookingData): string | null {
  if (!data.event_name?.trim()) {
    return 'El nombre del evento es requerido';
  }
  if (!data.booking_date) {
    return 'La fecha es requerida';
  }
  if (!data.start_time || !data.end_time) {
    return 'Las horas de inicio y fin son requeridas';
  }

  const startTime = normalizeTime(data.start_time);
  const endTime = normalizeTime(data.end_time);

  if (startTime >= endTime) {
    return 'La hora de inicio debe ser anterior a la hora de fin';
  }

  return null;
}

// ==================== Conflict Detection ====================

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = normalizeTime(startA);
  const a1 = normalizeTime(endA);
  const b0 = normalizeTime(startB);
  const b1 = normalizeTime(endB);
  return a0 < b1 && a1 > b0;
}

// ==================== Event Bookings API ====================

export const supabaseEventBookingsApi = {
  /**
   * Create a new event in the bookings table with validation and conflict detection
   */
  create: async (data: CreateEventBookingData): Promise<ApiBooking> => {
    // 1. Validate
    const validationError = validateEventData(data);
    if (validationError) {
      throw new Error(validationError);
    }

    // 2. Build payload
    const startTime = normalizeTime(data.start_time);
    const endTime = normalizeTime(data.end_time);

    const payload = {
      business_id: getBusinessId(),
      booking_type: 'event',
      status: 'confirmed',
      booking_date: data.booking_date,
      start_time: startTime,
      end_time: endTime,
      event_name: data.event_name.trim(),
      client_name: data.event_name.trim(), // compatibility with booking display
      client_id: null,
      service_id: null,
      client_email: null,
      client_phone: null,
      service_name: '',
      service_duration: 0,
      service_price: 0,
      source: 'phone',
      user_id: data.user_id || null,
      barber: data.barber || null,
      location: data.location || null,
      notes: data.notes || null,
      color: data.color || null,
      is_recurring: data.is_recurring ?? false,
      recurrence_rule: data.recurrence_rule || null,
    };


    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('No se pudo crear el evento. Inténtalo de nuevo.');
    }

    const rows: DbBooking[] = await response.json();
    return mapDbToApiBooking(rows[0]);
  },

  /**
   * Update an existing event booking
   */
  update: async (eventId: string, data: UpdateEventBookingData): Promise<ApiBooking> => {
    // Validate times if both are provided
    if (data.start_time && data.end_time) {
      const startTime = normalizeTime(data.start_time);
      const endTime = normalizeTime(data.end_time);
      if (startTime >= endTime) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.event_name !== undefined) {
      payload.event_name = data.event_name;
      payload.client_name = data.event_name; // keep in sync
    }
    if (data.booking_date !== undefined) payload.booking_date = data.booking_date;
    if (data.start_time !== undefined) payload.start_time = normalizeTime(data.start_time);
    if (data.end_time !== undefined) payload.end_time = normalizeTime(data.end_time);
    if (data.user_id !== undefined) payload.user_id = data.user_id;
    if (data.barber !== undefined) payload.barber = data.barber;
    if (data.location !== undefined) payload.location = data.location;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.color !== undefined) payload.color = data.color;
    if (data.is_recurring !== undefined) payload.is_recurring = data.is_recurring;
    if (data.recurrence_rule !== undefined) payload.recurrence_rule = data.recurrence_rule;


    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings?id=eq.${eventId}&business_id=eq.${getBusinessId()}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('No se pudo actualizar el evento.');
    }

    const rows: DbBooking[] = await response.json();
    if (rows.length === 0) throw new Error('Evento no encontrado');

    return mapDbToApiBooking(rows[0]);
  },

  /**
   * Delete an event booking
   */
  delete: async (eventId: string): Promise<void> => {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings?id=eq.${eventId}&business_id=eq.${getBusinessId()}`;


    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('No se pudo eliminar el evento.');
    }

  },
};

export default supabaseBookingsApi;
