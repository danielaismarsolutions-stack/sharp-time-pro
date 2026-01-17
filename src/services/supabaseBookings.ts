// Supabase Bookings API Service
// Handles all booking-related operations with Supabase

import { SUPABASE_CONFIG, BUSINESS_ID } from '@/config/api';
import { ApiBooking, ApiBookingStatus, ApiBookingSource } from '@/types/api';

// ==================== Types ====================

export interface DbBooking {
  id: string;
  business_id: string;
  client_id: string;
  service_id: string;
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
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingData {
  client_id: string;
  service_id: string;
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
}

export interface UpdateBookingData {
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  status?: ApiBookingStatus;
  notes?: string | null;
  cancellation_reason?: string | null;
  barber?: string | null;
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

const supabaseHeaders = {
  'apikey': SUPABASE_CONFIG.anonKey,
  'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
  'Content-Type': 'application/json',
};

// Map DB booking to API booking (no transformation needed, same structure)
const mapDbToApiBooking = (dbBooking: DbBooking): ApiBooking => dbBooking;

// ==================== Bookings API ====================

export const supabaseBookingsApi = {
  /**
   * Fetch all bookings with optional filters
   */
  getAll: async (filters?: BookingFilters): Promise<ApiBooking[]> => {
    const url = new URL(`${SUPABASE_CONFIG.url}/rest/v1/bookings`);
    
    // Always filter by business_id
    url.searchParams.append('business_id', `eq.${BUSINESS_ID}`);
    
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
    
    console.log(`🔄 Fetching bookings from: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: supabaseHeaders,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch bookings:', errorText);
      throw new Error('Failed to fetch bookings');
    }
    
    const data: DbBooking[] = await response.json();
    console.log('✅ Bookings loaded:', data.length);
    
    return data.map(mapDbToApiBooking);
  },

  /**
   * Fetch a specific booking by ID
   */
  getById: async (bookingId: string): Promise<ApiBooking | null> => {
    const url = new URL(`${SUPABASE_CONFIG.url}/rest/v1/bookings`);
    url.searchParams.append('id', `eq.${bookingId}`);
    url.searchParams.append('business_id', `eq.${BUSINESS_ID}`);
    
    const response = await fetch(url.toString(), {
      headers: supabaseHeaders,
    });
    
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
      business_id: BUSINESS_ID,
      ...bookingData,
      status: bookingData.status || 'confirmed',
      source: bookingData.source || 'phone',
    };
    
    console.log('🔄 Creating booking:', payload);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create booking:', errorText);
      throw new Error('Failed to create booking');
    }
    
    const data: DbBooking[] = await response.json();
    console.log('✅ Booking created:', data[0]);
    
    return mapDbToApiBooking(data[0]);
  },

  /**
   * Update an existing booking
   */
  update: async (bookingId: string, updates: UpdateBookingData): Promise<ApiBooking> => {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings?id=eq.${bookingId}&business_id=eq.${BUSINESS_ID}`;
    
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    console.log('🔄 Updating booking:', bookingId, payload);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to update booking:', errorText);
      throw new Error('Failed to update booking');
    }
    
    const data: DbBooking[] = await response.json();
    
    if (data.length === 0) {
      throw new Error('Booking not found');
    }
    
    console.log('✅ Booking updated:', data[0]);
    
    return mapDbToApiBooking(data[0]);
  },

  /**
   * Delete a booking (hard delete)
   */
  delete: async (bookingId: string): Promise<void> => {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/bookings?id=eq.${bookingId}&business_id=eq.${BUSINESS_ID}`;
    
    console.log('🔄 Deleting booking:', bookingId);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: supabaseHeaders,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to delete booking:', errorText);
      throw new Error('Failed to delete booking');
    }
    
    console.log('✅ Booking deleted:', bookingId);
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

export default supabaseBookingsApi;
