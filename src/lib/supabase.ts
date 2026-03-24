import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/config/api';

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Custom error thrown when the session has expired or is missing.
 * Caught by the AuthContext listener to redirect to login.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

/**
 * Returns Supabase REST API headers using the current session's JWT.
 * Throws SessionExpiredError if no valid session exists — never falls back to anon key.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    window.dispatchEvent(new CustomEvent('supabase:session-expired'));
    throw new SessionExpiredError();
  }

  return {
    'apikey': SUPABASE_CONFIG.anonKey,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}
