// Supabase Business Hours Service
// Syncs the Settings > Schedule page with the business_hours table
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
interface DbBusinessHour {
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

// Convert database rows to the UI BusinessHours format
const mapDbToBusinessHours = (rows: DbBusinessHour[]): BusinessHours => {
  const hours: BusinessHours = {};

  rows.forEach((row) => {
    const dayName = NUMBER_TO_DAY[row.day_of_week];
    if (dayName) {
      hours[dayName] = {
        isOpen: row.is_open,
        openTime: row.open_time ? row.open_time.slice(0, 5) : '09:00', // HH:MM:SS -> HH:MM
        closeTime: row.close_time ? row.close_time.slice(0, 5) : '18:00',
      };
    }
  });

  return hours;
};

// Convert a single database row to a partial BusinessHours update
export const mapSingleDbRow = (row: DbBusinessHour): { day: string; data: BusinessHours[string] } | null => {
  const dayName = NUMBER_TO_DAY[row.day_of_week];
  if (!dayName) return null;

  return {
    day: dayName,
    data: {
      isOpen: row.is_open,
      openTime: row.open_time ? row.open_time.slice(0, 5) : '09:00',
      closeTime: row.close_time ? row.close_time.slice(0, 5) : '18:00',
    },
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
      `${SUPABASE_CONFIG.url}/rest/v1/business_hours?business_id=eq.${businessId}&order=day_of_week.asc`,
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

  /** Upsert all 7 days of business hours (uses the unique constraint on business_id + day_of_week) */
  async upsertAll(hours: BusinessHours): Promise<BusinessHours> {
    const businessId = getBusinessId();
    const now = new Date().toISOString();

    const rows = Object.entries(hours).map(([dayName, dayHours]) => ({
      business_id: businessId,
      day_of_week: DAY_TO_NUMBER[dayName],
      is_open: dayHours.isOpen,
      open_time: dayHours.openTime + ':00', // HH:MM -> HH:MM:SS
      close_time: dayHours.closeTime + ':00',
      updated_at: now,
    }));

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/business_hours`,
      {
        method: 'POST',
        headers: {
          ...supabaseHeaders(),
          // Upsert on the unique constraint (business_id, day_of_week)
          'Prefer': 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify(rows),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to save business hours: ${error}`);
    }

    const savedRows: DbBusinessHour[] = await response.json();
    return mapDbToBusinessHours(savedRows);
  },
};

export default supabaseBusinessHoursApi;
