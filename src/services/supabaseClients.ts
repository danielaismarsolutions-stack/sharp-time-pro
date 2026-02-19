// Supabase Clients API
// Direct connection to Supabase for clients CRUD operations

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { Client, Booking } from '@/types';

// Database client type (maps to Supabase schema)
interface DbClient {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  total_visits: number;
  total_spent: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

// Database booking type (maps to Supabase schema)
interface DbBooking {
  id: string;
  business_id: string;
  client_id: string;
  service_name: string;
  service_price: number;
  service_duration: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

// Convert DB format to frontend format
function mapDbToClient(db: DbClient): Client {
  return {
    id: db.id,
    name: db.name,
    phone: db.phone || '',
    email: db.email || '',
    notes: db.notes || '',
    tags: db.tags || [],
    totalVisits: db.total_visits || 0,
    totalSpent: Number(db.total_spent) || 0,
    lastVisit: db.last_visit_at,
    createdAt: db.created_at,
  };
}

// Convert DB booking to frontend booking format
function mapDbToBooking(db: DbBooking): Booking {
  return {
    id: db.id,
    clientId: db.client_id,
    clientName: '', // Will be filled from client data
    clientPhone: '',
    clientEmail: '',
    serviceId: '', // Not stored in this simplified schema
    serviceName: db.service_name,
    serviceDuration: db.service_duration,
    servicePrice: Number(db.service_price),
    date: db.booking_date,
    time: db.start_time.slice(0, 5), // HH:mm format
    status: db.status as Booking['status'],
    source: 'online',
    notes: db.notes || '',
    createdAt: db.created_at,
  };
}

// Convert frontend format to DB format
function mapClientToDb(client: Partial<Client>): Partial<DbClient> {
  const db: Partial<DbClient> = {};
  
  if (client.name !== undefined) db.name = client.name;
  if (client.phone !== undefined) db.phone = client.phone || null;
  if (client.email !== undefined) db.email = client.email || null;
  if (client.notes !== undefined) db.notes = client.notes || null;
  if (client.tags !== undefined) db.tags = client.tags;
  
  return db;
}

// Generic Supabase fetch wrapper with authenticated headers
async function supabaseFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1${endpoint}`;
  const authHeaders = await getAuthHeaders();

  const config: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      'Prefer': options.method === 'POST' ? 'return=representation' :
                options.method === 'PATCH' ? 'return=representation' : 'return=minimal',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Supabase Error:', errorText);
    throw new Error(`Supabase error: ${response.status} - ${errorText}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json();
}

export interface ClientWithBookings extends Client {
  bookings: Booking[];
}

export const supabaseClientsApi = {
  /**
   * Fetch all clients for the business
   */
  getAll: async (search?: string): Promise<Client[]> => {
    let endpoint = `/clients?business_id=eq.${getBusinessId()}&order=created_at.desc`;
    
    if (search) {
      // Search by name, phone, or email using OR
      endpoint += `&or=(name.ilike.*${encodeURIComponent(search)}*,phone.ilike.*${encodeURIComponent(search)}*,email.ilike.*${encodeURIComponent(search)}*)`;
    }
    
    const data = await supabaseFetch<DbClient[]>(endpoint);
    return data.map(mapDbToClient);
  },

  /**
   * Fetch a specific client by ID
   */
  getById: async (id: string): Promise<Client | null> => {
    const endpoint = `/clients?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    const data = await supabaseFetch<DbClient[]>(endpoint);
    
    if (data.length === 0) return null;
    return mapDbToClient(data[0]);
  },

  /**
   * Fetch a client with their full booking history
   */
  getWithBookings: async (clientId: string): Promise<ClientWithBookings | null> => {
    // Get client data
    const clientEndpoint = `/clients?id=eq.${clientId}&business_id=eq.${getBusinessId()}`;
    const clients = await supabaseFetch<DbClient[]>(clientEndpoint);
    
    if (clients.length === 0) return null;
    
    const client = mapDbToClient(clients[0]);
    
    // Get client's booking history
    const bookingsEndpoint = `/bookings?client_id=eq.${clientId}&business_id=eq.${getBusinessId()}&order=booking_date.desc,start_time.desc`;
    const bookingsData = await supabaseFetch<DbBooking[]>(bookingsEndpoint);
    
    const bookings = bookingsData.map(b => ({
      ...mapDbToBooking(b),
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
    }));
    
    return {
      ...client,
      bookings,
    };
  },

  /**
   * Create a new client
   */
  create: async (client: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent' | 'lastVisit'>): Promise<Client> => {
    const dbData = {
      business_id: getBusinessId(),
      ...mapClientToDb(client),
      total_visits: 0,
      total_spent: 0,
      last_visit_at: null,
    };
    
    const data = await supabaseFetch<DbClient[]>('/clients', {
      method: 'POST',
      body: JSON.stringify(dbData),
    });
    
    return mapDbToClient(data[0]);
  },

  /**
   * Update an existing client
   */
  update: async (id: string, updates: Partial<Client>): Promise<Client> => {
    const dbData = {
      ...mapClientToDb(updates),
      updated_at: new Date().toISOString(),
    };
    
    const endpoint = `/clients?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    const data = await supabaseFetch<DbClient[]>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(dbData),
    });
    
    if (!data || data.length === 0) {
      throw new Error('Client not found or update failed');
    }
    
    return mapDbToClient(data[0]);
  },

  /**
   * Update client tags
   */
  updateTags: async (id: string, tags: string[]): Promise<Client> => {
    return supabaseClientsApi.update(id, { tags });
  },

  /**
   * Delete a client
   */
  delete: async (id: string): Promise<void> => {
    const endpoint = `/clients?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    await supabaseFetch<void>(endpoint, {
      method: 'DELETE',
    });
  },

  /**
   * Get booking history for a client
   */
  getBookingHistory: async (clientId: string): Promise<Booking[]> => {
    const endpoint = `/bookings?client_id=eq.${clientId}&business_id=eq.${getBusinessId()}&order=booking_date.desc,start_time.desc`;
    const data = await supabaseFetch<DbBooking[]>(endpoint);
    return data.map(mapDbToBooking);
  },
};

export default supabaseClientsApi;
