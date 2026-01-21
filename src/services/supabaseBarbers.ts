// Supabase API service for barbers
import { SUPABASE_CONFIG, BUSINESS_ID } from '@/config/api';
import { Barber, NewBarber, WeekSchedule, DEFAULT_SCHEDULE } from '@/types/barber';

const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation',
};

// Fetch all barbers for the business
export async function fetchBarbers(): Promise<Barber[]> {
  const url = `${SUPABASE_URL}/rest/v1/barbers?business_id=eq.${BUSINESS_ID}&order=display_order.asc`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch barbers: ${error}`);
  }

  return response.json();
}

// Fetch a single barber by ID
export async function fetchBarberById(id: string): Promise<Barber | null> {
  const url = `${SUPABASE_URL}/rest/v1/barbers?id=eq.${id}&business_id=eq.${BUSINESS_ID}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch barber: ${error}`);
  }

  const data = await response.json();
  return data.length > 0 ? data[0] : null;
}

// Create a new barber
export async function createBarber(barberData: Partial<NewBarber>): Promise<Barber> {
  const url = `${SUPABASE_URL}/rest/v1/barbers`;
  
  const newBarber = {
    business_id: BUSINESS_ID,
    name: barberData.name || 'Nuevo Barbero',
    email: barberData.email || null,
    phone: barberData.phone || null,
    avatar_url: barberData.avatar_url || null,
    bio: barberData.bio || null,
    schedule: barberData.schedule || DEFAULT_SCHEDULE,
    time_off: [],
    is_active: barberData.is_active ?? true,
    accepts_online_bookings: barberData.accepts_online_bookings ?? true,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(newBarber),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create barber: ${error}`);
  }

  const data = await response.json();
  return data[0];
}

// Update a barber
export async function updateBarber(id: string, updates: Partial<Barber>): Promise<Barber> {
  const url = `${SUPABASE_URL}/rest/v1/barbers?id=eq.${id}&business_id=eq.${BUSINESS_ID}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      ...updates,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update barber: ${error}`);
  }

  const data = await response.json();
  return data[0];
}

// Update barber schedule
export async function updateBarberSchedule(id: string, schedule: WeekSchedule): Promise<Barber> {
  return updateBarber(id, { schedule });
}

// Soft delete a barber (set is_active to false)
export async function archiveBarber(id: string): Promise<Barber> {
  return updateBarber(id, { is_active: false });
}

// Reactivate a barber
export async function reactivateBarber(id: string): Promise<Barber> {
  return updateBarber(id, { is_active: true });
}

// Toggle online bookings
export async function toggleOnlineBookings(id: string, accepts: boolean): Promise<Barber> {
  return updateBarber(id, { accepts_online_bookings: accepts });
}
