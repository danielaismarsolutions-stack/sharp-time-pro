// Supabase Barber-Services API
// Manages the many-to-many relationship between barbers and services

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';

interface DbBarberService {
  id: string;
  business_id: string;
  barber_id: string;
  service_id: string;
  created_at: string;
}

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

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json();
}

export const supabaseBarberServicesApi = {
  /**
   * Batch-fetch barber IDs for multiple services in a single request.
   * Returns a map of serviceId -> barberIds[].
   */
  getBarberIdsForServices: async (serviceIds: string[]): Promise<Record<string, string[]>> => {
    if (serviceIds.length === 0) return {};

    const businessId = getBusinessId();
    const idsParam = serviceIds.map(id => `"${id}"`).join(',');
    const endpoint = `/barber_services?business_id=eq.${businessId}&service_id=in.(${idsParam})&select=barber_id,service_id`;

    const data = await supabaseFetch<Pick<DbBarberService, 'barber_id' | 'service_id'>[]>(endpoint);

    const result: Record<string, string[]> = {};
    for (const id of serviceIds) {
      result[id] = [];
    }
    for (const row of data) {
      if (result[row.service_id]) {
        result[row.service_id].push(row.barber_id);
      }
    }
    return result;
  },

  /**
   * Replace all barber assignments for a service (delete existing, insert new).
   */
  replaceBarberAssignments: async (serviceId: string, barberIds: string[]): Promise<void> => {
    const businessId = getBusinessId();

    // Delete existing assignments
    await supabaseFetch<void>(
      `/barber_services?service_id=eq.${serviceId}&business_id=eq.${businessId}`,
      { method: 'DELETE' }
    );

    // Insert new assignments
    if (barberIds.length > 0) {
      const rows = barberIds.map(barberId => ({
        business_id: businessId,
        barber_id: barberId,
        service_id: serviceId,
      }));

      await supabaseFetch<DbBarberService[]>('/barber_services', {
        method: 'POST',
        body: JSON.stringify(rows),
      });
    }
  },

  /**
   * Assign all active barbers to a service (used when creating a new service).
   */
  assignAllActiveBarbers: async (serviceId: string): Promise<void> => {
    const businessId = getBusinessId();

    // Fetch all active barbers for this business
    const endpoint = `/users?business_id=eq.${businessId}&is_active=eq.true&select=id`;
    const barbers = await supabaseFetch<{ id: string }[]>(endpoint);

    if (barbers.length === 0) return;

    const rows = barbers.map(barber => ({
      business_id: businessId,
      barber_id: barber.id,
      service_id: serviceId,
    }));

    await supabaseFetch<DbBarberService[]>('/barber_services', {
      method: 'POST',
      body: JSON.stringify(rows),
      headers: { 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
    });
  },

  /**
   * Assign a barber to all active services (used when creating a new barber).
   */
  assignBarberToAllServices: async (barberId: string): Promise<void> => {
    const businessId = getBusinessId();

    // Fetch all active services for this business
    const endpoint = `/services?business_id=eq.${businessId}&is_active=eq.true&select=id`;
    const services = await supabaseFetch<{ id: string }[]>(endpoint);

    if (services.length === 0) return;

    const rows = services.map(service => ({
      business_id: businessId,
      barber_id: barberId,
      service_id: service.id,
    }));

    await supabaseFetch<DbBarberService[]>('/barber_services', {
      method: 'POST',
      body: JSON.stringify(rows),
      headers: { 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
    });
  },
};

export default supabaseBarberServicesApi;
