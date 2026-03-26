// Supabase Time Entries Service - Clock-in/Clock-out tracking
import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import type { TimeEntry, TimeEntryFilters, TimeEntryCorrectionData } from '@/types/timeEntry';

const supabaseHeaders = async () => ({
  ...(await getAuthHeaders()),
  'Prefer': 'return=representation',
});

// Database row shape
interface DbTimeEntry {
  id: string;
  business_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbToTimeEntry(row: DbTimeEntry & { users?: { full_name: string; avatar_url: string | null } }): TimeEntry {
  return {
    id: row.id,
    business_id: row.business_id,
    user_id: row.user_id,
    clock_in: row.clock_in,
    clock_out: row.clock_out,
    duration_minutes: row.duration_minutes,
    status: row.status as TimeEntry['status'],
    notes: row.notes,
    corrected_by: row.corrected_by,
    corrected_at: row.corrected_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_name: row.users?.full_name,
    user_avatar: row.users?.avatar_url ?? undefined,
  };
}

export const supabaseTimeEntriesApi = {
  /** Get the current open session for a user (if any) */
  async getOpenSession(userId: string): Promise<TimeEntry | null> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries?business_id=eq.${businessId}&user_id=eq.${userId}&status=eq.open&select=*,users(full_name,avatar_url)&limit=1`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching open session: ${res.status}`);

    const rows = await res.json();
    return rows.length > 0 ? mapDbToTimeEntry(rows[0]) : null;
  },

  /** Clock in - create a new open time entry */
  async clockIn(userId: string, notes?: string): Promise<TimeEntry> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries`;

    const body: Record<string, unknown> = {
      business_id: businessId,
      user_id: userId,
      status: 'open',
    };
    if (notes) body.notes = notes;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      // Unique constraint violation = already clocked in
      if (res.status === 409 || errorBody.includes('23505') || errorBody.includes('idx_time_entries_open_session')) {
        throw new Error('Ya tienes un fichaje abierto. Ficha salida antes de volver a fichar entrada.');
      }
      throw new Error(`Error al fichar entrada: ${res.status}`);
    }

    const rows = await res.json();
    return mapDbToTimeEntry(rows[0]);
  },

  /** Clock out - close an open time entry */
  async clockOut(entryId: string, notes?: string): Promise<TimeEntry> {
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries?id=eq.${entryId}`;

    const body: Record<string, unknown> = {
      clock_out: new Date().toISOString(),
      status: 'closed',
      updated_at: new Date().toISOString(),
    };
    if (notes) body.notes = notes;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Error al fichar salida: ${res.status}`);

    const rows = await res.json();
    return mapDbToTimeEntry(rows[0]);
  },

  /** Get all active (open) sessions for the business (admin view) */
  async getActiveSessions(): Promise<TimeEntry[]> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries?business_id=eq.${businessId}&status=eq.open&select=*,users(full_name,avatar_url)&order=clock_in.asc`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching active sessions: ${res.status}`);

    const rows = await res.json();
    return rows.map(mapDbToTimeEntry);
  },

  /** Get time entries with filters (date range, user, status) */
  async getByFilters(filters: TimeEntryFilters = {}): Promise<TimeEntry[]> {
    const businessId = getBusinessId();
    const headers = await supabaseHeaders();

    const params = new URLSearchParams();
    params.set('business_id', `eq.${businessId}`);
    params.set('select', '*,users(full_name,avatar_url)');
    params.set('order', 'clock_in.desc');
    params.set('limit', '500');

    if (filters.user_id) params.set('user_id', `eq.${filters.user_id}`);
    if (filters.start_date) params.set('clock_in', `gte.${filters.start_date}`);
    if (filters.end_date) params.append('clock_in', `lte.${filters.end_date}`);
    if (filters.status) params.set('status', `eq.${filters.status}`);

    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries?${params.toString()}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Error fetching time entries: ${res.status}`);

    const rows = await res.json();
    return rows.map(mapDbToTimeEntry);
  },

  /** Admin correction: update clock_in/clock_out and mark as corrected */
  async correctEntry(entryId: string, correctedById: string, data: TimeEntryCorrectionData): Promise<TimeEntry> {
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries?id=eq.${entryId}`;

    const body: Record<string, unknown> = {
      status: 'corrected',
      corrected_by: correctedById,
      corrected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (data.clock_in) body.clock_in = data.clock_in;
    if (data.clock_out) body.clock_out = data.clock_out;
    if (data.notes !== undefined) body.notes = data.notes;

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Error al corregir fichaje: ${res.status}`);

    const rows = await res.json();
    return mapDbToTimeEntry(rows[0]);
  },

  /** Admin delete: remove an erroneous entry */
  async deleteEntry(entryId: string): Promise<void> {
    const headers = await supabaseHeaders();
    const url = `${SUPABASE_CONFIG.url}/rest/v1/time_entries?id=eq.${entryId}`;

    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`Error al eliminar fichaje: ${res.status}`);
  },
};

export default supabaseTimeEntriesApi;
