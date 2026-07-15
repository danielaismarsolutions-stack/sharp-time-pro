// Stripe Billing Service
// Calls Supabase Edge Functions for subscription management

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { t } from '@/i18n';

export interface PaymentRecord {
  id: string;
  amount_paid: number;
  currency: string;
  status: 'paid' | 'failed' | 'open' | 'void';
  invoice_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface BillingInfo {
  plan_type: 'paid' | 'ambassador';
  monthly_price: number | null;
  subscription_status: 'none' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';
  current_period_end: string | null;
  has_payment_method: boolean;
  has_subscription: boolean;
  payment_history: PaymentRecord[];
}

async function callEdgeFunction<T>(fnName: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_CONFIG.url}/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ business_id: getBusinessId() }),
    }
  );

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(t('billing.errors.invalidResponse', { fn: fnName, status: res.status }));
  }

  if (!res.ok) {
    // Supabase relay uses "msg", Edge Functions use "error"
    const message = (data.error ?? data.msg ?? t('billing.errors.http', { status: res.status })) as string;
    throw new Error(message);
  }
  return data as T;
}

export const stripeBillingApi = {
  /** Fetch billing info + payment history */
  async getBillingInfo(): Promise<BillingInfo> {
    return callEdgeFunction<BillingInfo>('stripe-billing-info');
  },

  /** Create a Stripe Checkout Session for subscription setup */
  async createCheckoutSession(): Promise<{ url: string }> {
    return callEdgeFunction<{ url: string }>('stripe-create-checkout');
  },

  /** Create a Stripe Customer Portal session */
  async createPortalSession(): Promise<{ url: string }> {
    return callEdgeFunction<{ url: string }>('stripe-portal');
  },
};

export default stripeBillingApi;
