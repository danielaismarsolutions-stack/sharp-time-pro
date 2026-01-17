// Supabase Services API
// Direct connection to Supabase for services CRUD operations

import { SUPABASE_CONFIG, BUSINESS_ID } from '@/config/api';
import { Service } from '@/types';

// Database service type (maps to Supabase schema)
interface DbService {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  color: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Convert DB format to frontend format
function mapDbToService(db: DbService): Service {
  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    duration: db.duration_minutes,
    price: Number(db.price),
    color: db.color,
    isActive: db.is_active,
    bufferBefore: db.buffer_before_minutes,
    bufferAfter: db.buffer_after_minutes,
  };
}

// Convert frontend format to DB format
function mapServiceToDb(service: Partial<Service>): Partial<DbService> {
  const db: Partial<DbService> = {};
  
  if (service.name !== undefined) db.name = service.name;
  if (service.description !== undefined) db.description = service.description || null;
  if (service.duration !== undefined) db.duration_minutes = service.duration;
  if (service.price !== undefined) db.price = service.price;
  if (service.color !== undefined) db.color = service.color;
  if (service.isActive !== undefined) db.is_active = service.isActive;
  if (service.bufferBefore !== undefined) db.buffer_before_minutes = service.bufferBefore;
  if (service.bufferAfter !== undefined) db.buffer_after_minutes = service.bufferAfter;
  
  return db;
}

// Generic Supabase fetch wrapper
async function supabaseFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : 
                options.method === 'PATCH' ? 'return=representation' : 'return=minimal',
      ...options.headers,
    },
  };

  console.log(`🔄 Supabase Request: ${options.method || 'GET'} ${url}`);
  
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
  
  const data = await response.json();
  console.log('✅ Supabase Response:', data);
  return data;
}

export const supabaseServicesApi = {
  /**
   * Fetch all services for the business
   */
  getAll: async (includeInactive = true): Promise<Service[]> => {
    let endpoint = `/services?business_id=eq.${BUSINESS_ID}&order=display_order.asc,name.asc`;
    
    if (!includeInactive) {
      endpoint += '&is_active=eq.true';
    }
    
    const data = await supabaseFetch<DbService[]>(endpoint);
    return data.map(mapDbToService);
  },

  /**
   * Fetch a specific service by ID
   */
  getById: async (id: string): Promise<Service | null> => {
    const endpoint = `/services?id=eq.${id}&business_id=eq.${BUSINESS_ID}`;
    const data = await supabaseFetch<DbService[]>(endpoint);
    
    if (data.length === 0) return null;
    return mapDbToService(data[0]);
  },

  /**
   * Create a new service
   */
  create: async (service: Omit<Service, 'id'>): Promise<Service> => {
    const dbData = {
      business_id: BUSINESS_ID,
      ...mapServiceToDb(service),
    };
    
    const data = await supabaseFetch<DbService[]>('/services', {
      method: 'POST',
      body: JSON.stringify(dbData),
    });
    
    return mapDbToService(data[0]);
  },

  /**
   * Update an existing service
   */
  update: async (id: string, updates: Partial<Service>): Promise<Service> => {
    const dbData = {
      ...mapServiceToDb(updates),
      updated_at: new Date().toISOString(),
    };
    
    const endpoint = `/services?id=eq.${id}&business_id=eq.${BUSINESS_ID}`;
    const data = await supabaseFetch<DbService[]>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(dbData),
    });
    
    if (!data || data.length === 0) {
      throw new Error('Service not found or update failed');
    }
    
    return mapDbToService(data[0]);
  },

  /**
   * Soft delete a service (set is_active to false)
   */
  delete: async (id: string): Promise<void> => {
    const endpoint = `/services?id=eq.${id}&business_id=eq.${BUSINESS_ID}`;
    await supabaseFetch<void>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
        updated_at: new Date().toISOString(),
      }),
    });
  },
};

export default supabaseServicesApi;