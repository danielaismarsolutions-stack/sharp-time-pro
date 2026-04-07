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
  'antelacion_min (horas)': number | null;
  'antelacion_max (dias)': number | null;
  client_notification_delay: number | null;
  time_tracking_enabled: boolean;
  monthly_price: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  // Verifactu / fiscal data (added in add_verifactu_invoicing.sql)
  tax_id: string | null;
  legal_name: string | null;
  fiscal_address: string | null;
  fiscal_postal_code: string | null;
  fiscal_city: string | null;
  fiscal_province: string | null;
  fiscal_country: string | null;
  verifactu_enabled: boolean | null;
  verifactu_provider: string | null;
  verifactu_provider_org_id: string | null;
  invoice_series_prefix: string | null;
  simplified_invoice_series_prefix: string | null;
  default_iva_rate: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BusinessFormData {
  businessName: string;
  phone: string;
  address: string;
  contactEmail: string; // maps to contact_email column
  logoUrl?: string | null; // maps to logo_url column
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
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}&select=business_name,phone,address,contact_email,logo_url`;

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
      logoUrl: row.logo_url ?? null,
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
    if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Error updating business: ${res.status}`);
  },

  /** Fetch booking advance settings (antelación) */
  async getBookingSettings(): Promise<{ minAdvanceBooking: number; maxAdvanceBooking: number }> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}&select="antelacion_min (horas)","antelacion_max (dias)"`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching booking settings: ${res.status}`);

    const rows: Pick<DbBusiness, 'antelacion_min (horas)' | 'antelacion_max (dias)'>[] = await res.json();
    const row = rows[0];
    if (!row) throw new Error('Business not found');

    return {
      minAdvanceBooking: row['antelacion_min (horas)'] ?? 1,
      maxAdvanceBooking: row['antelacion_max (dias)'] ?? 30,
    };
  },

  /** Update booking advance settings (antelación) */
  async updateBookingSettings(data: { minAdvanceBooking: number; maxAdvanceBooking: number }): Promise<void> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        'antelacion_min (horas)': data.minAdvanceBooking,
        'antelacion_max (dias)': data.maxAdvanceBooking,
      }),
    });

    if (!res.ok) throw new Error(`Error updating booking settings: ${res.status}`);
  },

  /** Fetch client notification delay setting */
  async getNotificationSettings(): Promise<{ emailReminder: boolean; reminderTiming: number }> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}&select=client_notification_delay`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching notification settings: ${res.status}`);

    const rows: Pick<DbBusiness, 'client_notification_delay'>[] = await res.json();
    const row = rows[0];
    if (!row) throw new Error('Business not found');

    return {
      emailReminder: row.client_notification_delay !== null,
      reminderTiming: row.client_notification_delay ?? 24,
    };
  },

  /** Update client notification delay setting */
  async updateNotificationSettings(data: { emailReminder: boolean; reminderTiming: number }): Promise<void> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        client_notification_delay: data.emailReminder ? data.reminderTiming : null,
      }),
    });

    if (!res.ok) throw new Error(`Error updating notification settings: ${res.status}`);
  },

  /** Fetch time tracking enabled setting */
  async getTimeTrackingSettings(): Promise<{ timeTrackingEnabled: boolean }> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}&select=time_tracking_enabled`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching time tracking settings: ${res.status}`);

    const rows: Pick<DbBusiness, 'time_tracking_enabled'>[] = await res.json();
    const row = rows[0];
    if (!row) throw new Error('Business not found');

    return {
      timeTrackingEnabled: row.time_tracking_enabled ?? false,
    };
  },

  /** Update time tracking enabled setting */
  async updateTimeTrackingSettings(enabled: boolean): Promise<void> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${businessId}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ time_tracking_enabled: enabled }),
    });

    if (!res.ok) throw new Error(`Error updating time tracking settings: ${res.status}`);
  },
};

export default supabaseBusinessesApi;
