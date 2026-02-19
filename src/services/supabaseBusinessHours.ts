// Supabase Business Hours Service
// Syncs the Settings > Schedule page with the business_hours table
// Supports multiple shifts per day (delete-all + insert approach)
import { SUPABASE_CONFIG } from '@/config/api';
import { getBusinessId } from '@/config/session';
import { BusinessHours } from '@/types';

const supabaseHeaders = () => ({
  'apikey': SUPABASE_CONFIG.anonKey,
  'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

// Database row shape for business_hours table
export interface DbBusinessHour {
  id: string;
  business_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ... 6=Saturday
  is_open: boolean;
  open_time: string | null; // HH:MM:SS
  close_time: string | null; // HH:MM:SS
  created_at: string;
  updated_at: string;
}

// Day name to day_of_week number mapping (same convention as barber_schedules)
const DAY_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const NUMBER_TO_DAY: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// Convert database rows to the UI BusinessHours format (supports multiple shifts per day)
const mapDbToBusinessHours = (rows: DbBusinessHour[]): BusinessHours => {
  const hours: BusinessHours = {};

  // Initialize all days as closed with empty shifts
  Object.values(NUMBER_TO_DAY).forEach((dayName) => {
    hours[dayName] = { isOpen: false, shifts: [] };
  });

  // Group rows by day
  rows.forEach((row) => {
    const dayName = NUMBER_TO_DAY[row.day_of_week];
    if (!dayName) return;

    if (row.is_open && row.open_time && row.close_time) {
      hours[dayName].isOpen = true;
      hours[dayName].shifts.push({
        openTime: row.open_time.slice(0, 5), // HH:MM:SS -> HH:MM
        closeTime: row.close_time.slice(0, 5),
      });
    } else if (!row.is_open) {
      hours[dayName].isOpen = false;
    }
  });

  // Sort shifts by openTime
  Object.values(hours).forEach((day) => {
    day.shifts.sort((a, b) => a.openTime.localeCompare(b.openTime));
  });

  return hours;
};

// Convert database rows for a single day into a BusinessHours day entry
export const mapDbRowsForDay = (
  rows: DbBusinessHour[],
  dayOfWeek: number
): { day: string; data: BusinessHours[string] } | null => {
  const dayName = NUMBER_TO_DAY[dayOfWeek];
  if (!dayName) return null;

  const dayRows = rows.filter((r) => r.day_of_week === dayOfWeek);

  if (dayRows.length === 0) {
    return { day: dayName, data: { isOpen: false, shifts: [] } };
  }

  const hasOpenShifts = dayRows.some((r) => r.is_open && r.open_time && r.close_time);

  const shifts = dayRows
    .filter((r) => r.is_open && r.open_time && r.close_time)
    .map((r) => ({
      openTime: r.open_time!.slice(0, 5),
      closeTime: r.close_time!.slice(0, 5),
    }))
    .sort((a, b) => a.openTime.localeCompare(b.openTime));

  return {
    day: dayName,
    data: { isOpen: hasOpenShifts, shifts },
  };
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.error || text;
    } catch {
      return text;
    }
  } catch {
    return 'Unknown error occurred';
  }
};

export const supabaseBusinessHoursApi = {
  /** Fetch all business hours for the current business */
  async getAll(): Promise<BusinessHours> {
    const businessId = getBusinessId();
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/business_hours?business_id=eq.${businessId}&order=day_of_week.asc,open_time.asc`,
      {
        method: 'GET',
        headers: supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to fetch business hours: ${error}`);
    }

    const rows: DbBusinessHour[] = await response.json();
    return mapDbToBusinessHours(rows);
  },

  /** Save all business hours (delete all existing + insert new rows) */
  async saveAll(hours: BusinessHours): Promise<BusinessHours> {
    const businessId = getBusinessId();
    const now = new Date().toISOString();

    // 1. Delete all existing rows for this business
    const deleteResponse = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/business_hours?business_id=eq.${businessId}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(),
      }
    );

    if (!deleteResponse.ok) {
      const error = await parseErrorMessage(deleteResponse);
      throw new Error(`Failed to delete existing business hours: ${error}`);
    }

    // 2. Build insert rows
    const rows: Omit<DbBusinessHour, 'id' | 'created_at' | 'updated_at'>[] = [];

    Object.entries(hours).forEach(([dayName, dayData]) => {
      const dayOfWeek = DAY_TO_NUMBER[dayName];
      if (dayOfWeek === undefined) return;

      if (dayData.isOpen && dayData.shifts.length > 0) {
        // Insert one row per shift
        dayData.shifts.forEach((shift) => {
          rows.push({
            business_id: businessId,
            day_of_week: dayOfWeek,
            is_open: true,
            open_time: shift.openTime + ':00', // HH:MM -> HH:MM:SS
            close_time: shift.closeTime + ':00',
          });
        });
      } else {
        // Closed day - insert a marker row
        rows.push({
          business_id: businessId,
          day_of_week: dayOfWeek,
          is_open: false,
          open_time: null,
          close_time: null,
        });
      }
    });

    // 3. Insert new rows
    if (rows.length > 0) {
      const insertResponse = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/business_hours`,
        {
          method: 'POST',
          headers: supabaseHeaders(),
          body: JSON.stringify(rows),
        }
      );

      if (!insertResponse.ok) {
        const error = await parseErrorMessage(insertResponse);
        throw new Error(`Failed to save business hours: ${error}`);
      }

      const savedRows: DbBusinessHour[] = await insertResponse.json();
      return mapDbToBusinessHours(savedRows);
    }

    return hours;
  },
};

export default supabaseBusinessHoursApi;
