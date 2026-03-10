// Supabase Services API
// Direct connection to Supabase for services CRUD operations

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
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
  service_photo: string | null;
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
    sortOrder: db.display_order,
    servicePhoto: db.service_photo,
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
  if (service.servicePhoto !== undefined) db.service_photo = service.servicePhoto ?? null;

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
    throw new Error(`Supabase error: ${response.status} - ${errorText}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json();
}

export const supabaseServicesApi = {
  /**
   * Fetch all services for the business
   */
  getAll: async (includeInactive = true): Promise<Service[]> => {
    let endpoint = `/services?business_id=eq.${getBusinessId()}&order=display_order.asc,name.asc`;
    
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
    const endpoint = `/services?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    const data = await supabaseFetch<DbService[]>(endpoint);
    
    if (data.length === 0) return null;
    return mapDbToService(data[0]);
  },

  /**
   * Create a new service
   */
  create: async (service: Omit<Service, 'id'>): Promise<Service> => {
    const dbData = {
      business_id: getBusinessId(),
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
    
    const endpoint = `/services?id=eq.${id}&business_id=eq.${getBusinessId()}`;
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
    const endpoint = `/services?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    await supabaseFetch<void>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
        updated_at: new Date().toISOString(),
      }),
    });
  },

  /**
   * Update the display order of multiple services
   */
  updateOrder: async (orderedIds: string[]): Promise<void> => {
    // Update each service's display_order based on its position in the array
    const updates = orderedIds.map((id, index) => 
      supabaseFetch<void>(`/services?id=eq.${id}&business_id=eq.${getBusinessId()}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_order: index,
          updated_at: new Date().toISOString(),
        }),
      })
    );
    
    await Promise.all(updates);
  },
};

export default supabaseServicesApi;