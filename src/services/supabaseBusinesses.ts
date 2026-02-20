// Supabase Businesses Service
// Bidirectional sync for Settings > Negocio tab with the businesses table

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';

export interface DbBusiness {
  id: string;
  business_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  plan_type: string | null;
  status: string | null;
  trial_ends_at: string | null;
  timezone: string | null;
  currency: string | null;
  language: string | null;
  location_url: string | null;
  contact_email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BusinessFormData {
  businessName: string;
  phone: string;
  address: string;
  contactEmail: string; // maps to contact_email column
}

const supabaseHeaders = async () => ({
  ...(await getAuthHeaders()),
  'Prefer': 'return=representation',
});

export const supabaseBusinessesApi = {
  /** Fetch the current business row */
  async get(): Promise<BusinessFormData> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}&select=business_name,phone,address,contact_email`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching business: ${res.status}`);

    const rows: DbBusiness[] = await res.json();
    const row = rows[0];
    if (!row) throw new Error('Business not found');

    return {
      businessName: row.business_name ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      contactEmail: row.contact_email ?? '',
    };
  },

  /** Update the current business row */
  async update(data: Partial<BusinessFormData>): Promise<void> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}`;

    const payload: Partial<DbBusiness> = {};
    if (data.businessName !== undefined) payload.business_name = data.businessName;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.address !== undefined) payload.address = data.address;
    if (data.contactEmail !== undefined) payload.contact_email = data.contactEmail;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Error updating business: ${res.status}`);
  },
};

export default supabaseBusinessesApi;
