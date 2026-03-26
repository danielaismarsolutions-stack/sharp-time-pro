export type TimeEntryStatus = 'open' | 'closed' | 'auto_closed' | 'corrected';

export interface TimeEntry {
  id: string;
  business_id: string;
  user_id: string;
  clock_in: string;       // ISO 8601 timestamptz
  clock_out: string | null;
  duration_minutes: number | null;
  status: TimeEntryStatus;
  notes: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined from users table for admin view
  user_name?: string;
  user_avatar?: string;
}

export interface ClockInData {
  notes?: string;
}

export interface ClockOutData {
  notes?: string;
}

export interface TimeEntryCorrectionData {
  clock_in?: string;
  clock_out?: string;
  notes?: string;
}

export interface TimeEntrySummary {
  user_id: string;
  user_name: string;
  total_minutes: number;
  entry_count: number;
  auto_closed_count: number;
}

export interface TimeEntryFilters {
  user_id?: string;
  start_date?: string;
  end_date?: string;
  status?: TimeEntryStatus;
}
