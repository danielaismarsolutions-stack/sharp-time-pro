// Supabase Barbers Service - Uses 'users' table + normalized schedule tables
import { SUPABASE_CONFIG, BUSINESS_ID } from '@/config/api';
import { Barber, CreateBarberData, UpdateBarberData, DEFAULT_SCHEDULE, BarberSchedule, BarberDaySchedule, TimeOff } from '@/types/barber';

const supabaseHeaders = () => ({
  'apikey': SUPABASE_CONFIG.anonKey,
  'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

// Map users table row to Barber interface
interface DbUser {
  id: string;
  business_id: string;
  name?: string;
  full_name?: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  role: string;
  booking_buffer_minutes?: number;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

// Database row for barber_schedules table
interface DbBarberSchedule {
  id: string;
  business_id: string;
  barber_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ... 6=Saturday
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
}

// Database row for barber_time_off table
interface DbBarberTimeOff {
  id: string;
  business_id: string;
  barber_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string | null;
}

// Day name to day_of_week mapping
const DAY_TO_NUMBER: Record<keyof BarberSchedule, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const NUMBER_TO_DAY: Record<number, keyof BarberSchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// Convert database schedule rows to BarberSchedule format
const mapDbScheduleToBarberSchedule = (rows: DbBarberSchedule[]): BarberSchedule => {
  // Start with default schedule (all days disabled)
  const schedule: BarberSchedule = {
    sunday: { enabled: false, shifts: [] },
    monday: { enabled: false, shifts: [] },
    tuesday: { enabled: false, shifts: [] },
    wednesday: { enabled: false, shifts: [] },
    thursday: { enabled: false, shifts: [] },
    friday: { enabled: false, shifts: [] },
    saturday: { enabled: false, shifts: [] },
  };

  // Group rows by day and populate shifts
  rows.forEach((row) => {
    const dayName = NUMBER_TO_DAY[row.day_of_week];
    if (dayName) {
      schedule[dayName].enabled = true;
      schedule[dayName].shifts.push({
        start: row.start_time.slice(0, 5), // Convert HH:MM:SS to HH:MM
        end: row.end_time.slice(0, 5),
      });
    }
  });

  // Sort shifts by start time for each day
  Object.keys(schedule).forEach((day) => {
    const dayKey = day as keyof BarberSchedule;
    schedule[dayKey].shifts.sort((a, b) => a.start.localeCompare(b.start));
  });

  return schedule;
};

// Convert database time_off rows to TimeOff array
const mapDbTimeOffToTimeOff = (rows: DbBarberTimeOff[]): TimeOff[] => {
  return rows.map((row) => ({
    id: row.id,
    start_date: row.start_date,
    end_date: row.end_date,
    reason: row.reason || undefined,
  }));
};

const mapUserToBarber = (
  user: DbUser,
  schedule: BarberSchedule = DEFAULT_SCHEDULE,
  timeOff: TimeOff[] = []
): Barber => ({
  id: user.id,
  business_id: user.business_id,
  name: user.full_name || user.name || '',
  email: user.email,
  phone: user.phone,
  avatar_url: user.avatar_url,
  bio: user.bio,
  schedule,
  time_off: timeOff,
  is_active: user.is_active,
  booking_buffer_minutes: user.booking_buffer_minutes,
  timezone: user.timezone,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

// Helper to parse error responses
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

export const supabaseBarbersApi = {
  // Fetch schedule from barber_schedules table
  async getSchedule(barberId: string): Promise<BarberSchedule> {
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/barber_schedules?barber_id=eq.${barberId}&order=day_of_week.asc,start_time.asc`,
      {
        method: 'GET',
        headers: supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to fetch schedule: ${error}`);
    }

    const rows: DbBarberSchedule[] = await response.json();
    return rows.length > 0 ? mapDbScheduleToBarberSchedule(rows) : DEFAULT_SCHEDULE;
  },

  // Fetch time_off from barber_time_off table
  async getTimeOff(barberId: string): Promise<TimeOff[]> {
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/barber_time_off?barber_id=eq.${barberId}&order=start_date.asc`,
      {
        method: 'GET',
        headers: supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to fetch time off: ${error}`);
    }

    const rows: DbBarberTimeOff[] = await response.json();
    return mapDbTimeOffToTimeOff(rows);
  },

  async getAll(includeInactive = false): Promise<Barber[]> {
    // Fetch users with role 'barber' from the users table
    let url = `${SUPABASE_CONFIG.url}/rest/v1/users?business_id=eq.${BUSINESS_ID}&role=eq.barber&order=full_name.asc`;
    
    if (!includeInactive) {
      url += '&is_active=eq.true';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders(),
    });

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to fetch barbers: ${error}`);
    }

    const users: DbUser[] = await response.json();
    
    // Fetch schedules and time_off for all barbers in parallel
    const barbersWithData = await Promise.all(
      users.map(async (user) => {
        const [schedule, timeOff] = await Promise.all([
          this.getSchedule(user.id).catch(() => DEFAULT_SCHEDULE),
          this.getTimeOff(user.id).catch(() => []),
        ]);
        return mapUserToBarber(user, schedule, timeOff);
      })
    );

    return barbersWithData;
  },

  async getById(barberId: string): Promise<Barber | null> {
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${barberId}&business_id=eq.${BUSINESS_ID}`,
      {
        method: 'GET',
        headers: supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to fetch barber: ${error}`);
    }

    const data: DbUser[] = await response.json();
    if (data.length === 0) return null;

    // Fetch schedule and time_off from normalized tables
    const [schedule, timeOff] = await Promise.all([
      this.getSchedule(barberId).catch(() => DEFAULT_SCHEDULE),
      this.getTimeOff(barberId).catch(() => []),
    ]);

    return mapUserToBarber(data[0], schedule, timeOff);
  },

  async create(barberData: CreateBarberData): Promise<Barber> {
    const payload = {
      business_id: BUSINESS_ID,
      full_name: barberData.name,
      email: barberData.email || null,
      phone: barberData.phone || null,
      avatar_url: barberData.avatar_url || null,
      bio: barberData.bio || null,
      is_active: barberData.is_active ?? true,
      role: 'barber',
    };

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/users`,
      {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to create barber: ${error}`);
    }

    const data: DbUser[] = await response.json();
    const newBarber = data[0];

    // If schedule provided, save it to barber_schedules table
    if (barberData.schedule) {
      await this.updateSchedule(newBarber.id, barberData.schedule);
    }

    return mapUserToBarber(newBarber, barberData.schedule || DEFAULT_SCHEDULE, []);
  },

  async update(barberId: string, updates: UpdateBarberData): Promise<Barber> {
    // Separate schedule and time_off from user updates
    const { name, schedule, time_off, ...restUpdates } = updates;
    
    // Update user record (without schedule/time_off which are now in separate tables)
    const payload: Record<string, unknown> = {
      ...restUpdates,
      updated_at: new Date().toISOString(),
    };
    
    if (name !== undefined) {
      payload.full_name = name;
    }

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${barberId}&business_id=eq.${BUSINESS_ID}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to update barber: ${error}`);
    }

    const data: DbUser[] = await response.json();

    // Handle schedule update if provided
    if (schedule) {
      await this.updateSchedule(barberId, schedule);
    }

    // Handle time_off update if provided
    if (time_off) {
      await this.replaceTimeOff(barberId, time_off);
    }

    // Fetch current schedule and time_off
    const [currentSchedule, currentTimeOff] = await Promise.all([
      schedule || this.getSchedule(barberId).catch(() => DEFAULT_SCHEDULE),
      time_off || this.getTimeOff(barberId).catch(() => []),
    ]);

    return mapUserToBarber(data[0], currentSchedule as BarberSchedule, currentTimeOff as TimeOff[]);
  },

  async delete(barberId: string): Promise<void> {
    // Soft delete - set is_active to false
    await this.update(barberId, { is_active: false });
  },

  // Save schedule to barber_schedules table (delete all + insert new)
  async updateSchedule(barberId: string, schedule: BarberSchedule): Promise<Barber> {
    // First, delete all existing schedule rows for this barber
    const deleteResponse = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/barber_schedules?barber_id=eq.${barberId}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(),
      }
    );

    if (!deleteResponse.ok) {
      const error = await parseErrorMessage(deleteResponse);
      throw new Error(`Failed to delete existing schedule: ${error}`);
    }

    // Build insert rows from schedule
    const rows: Omit<DbBarberSchedule, 'id'>[] = [];
    
    (Object.keys(schedule) as (keyof BarberSchedule)[]).forEach((dayName) => {
      const daySchedule: BarberDaySchedule = schedule[dayName];
      if (daySchedule.enabled && daySchedule.shifts.length > 0) {
        daySchedule.shifts.forEach((shift) => {
          rows.push({
            business_id: BUSINESS_ID,
            barber_id: barberId,
            day_of_week: DAY_TO_NUMBER[dayName],
            start_time: shift.start + ':00', // Convert HH:MM to HH:MM:SS
            end_time: shift.end + ':00',
          });
        });
      }
    });

    // Insert new rows if any
    if (rows.length > 0) {
      const insertResponse = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/barber_schedules`,
        {
          method: 'POST',
          headers: supabaseHeaders(),
          body: JSON.stringify(rows),
        }
      );

      if (!insertResponse.ok) {
        const error = await parseErrorMessage(insertResponse);
        throw new Error(`Failed to save schedule: ${error}`);
      }
    }

    // Return updated barber
    const barber = await this.getById(barberId);
    if (!barber) throw new Error('Barber not found after schedule update');
    return barber;
  },

  // Replace all time_off entries (used by update method)
  async replaceTimeOff(barberId: string, timeOff: TimeOff[]): Promise<void> {
    // Delete all existing time_off for this barber
    const deleteResponse = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/barber_time_off?barber_id=eq.${barberId}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(),
      }
    );

    if (!deleteResponse.ok) {
      const error = await parseErrorMessage(deleteResponse);
      throw new Error(`Failed to delete existing time off: ${error}`);
    }

    // Insert new time_off entries
    if (timeOff.length > 0) {
      const rows = timeOff.map((item) => ({
        business_id: BUSINESS_ID,
        barber_id: barberId,
        start_date: item.start_date,
        end_date: item.end_date,
        reason: item.reason || null,
      }));

      const insertResponse = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/barber_time_off`,
        {
          method: 'POST',
          headers: supabaseHeaders(),
          body: JSON.stringify(rows),
        }
      );

      if (!insertResponse.ok) {
        const error = await parseErrorMessage(insertResponse);
        throw new Error(`Failed to save time off: ${error}`);
      }
    }
  },

  // Update time_off by replacing all entries (called from TimeOffManager)
  async updateTimeOff(barberId: string, timeOff: TimeOff[]): Promise<Barber> {
    await this.replaceTimeOff(barberId, timeOff);
    
    // Return updated barber
    const barber = await this.getById(barberId);
    if (!barber) throw new Error('Barber not found after time off update');
    return barber;
  },

  // Add a single time_off entry
  async addTimeOff(barberId: string, timeOff: Omit<TimeOff, 'id'>): Promise<TimeOff> {
    const payload = {
      business_id: BUSINESS_ID,
      barber_id: barberId,
      start_date: timeOff.start_date,
      end_date: timeOff.end_date,
      reason: timeOff.reason || null,
    };

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/barber_time_off`,
      {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to add time off: ${error}`);
    }

    const data: DbBarberTimeOff[] = await response.json();
    return {
      id: data[0].id,
      start_date: data[0].start_date,
      end_date: data[0].end_date,
      reason: data[0].reason || undefined,
    };
  },

  // Delete a single time_off entry
  async deleteTimeOff(timeOffId: string): Promise<void> {
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/barber_time_off?id=eq.${timeOffId}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`Failed to delete time off: ${error}`);
    }
  },
};

export default supabaseBarbersApi;
