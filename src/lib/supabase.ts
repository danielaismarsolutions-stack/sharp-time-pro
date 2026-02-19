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
 * Returns Supabase REST API headers using the current session's JWT.
 * Falls back to anon key if no session is active.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_CONFIG.anonKey;

  return {
    'apikey': SUPABASE_CONFIG.anonKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
