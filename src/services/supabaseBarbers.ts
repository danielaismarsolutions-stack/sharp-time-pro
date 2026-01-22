// Supabase Barbers Service - Uses 'users' table
import { SUPABASE_CONFIG, BUSINESS_ID } from '@/config/api';
import { Barber, CreateBarberData, UpdateBarberData, DEFAULT_SCHEDULE, BarberSchedule, TimeOff } from '@/types/barber';

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
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  schedule: BarberSchedule | null;
  time_off: TimeOff[] | null;
  is_active: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

const mapUserToBarber = (user: DbUser): Barber => ({
  id: user.id,
  business_id: user.business_id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar_url: user.avatar_url,
  bio: user.bio,
  schedule: user.schedule || DEFAULT_SCHEDULE,
  time_off: user.time_off || [],
  is_active: user.is_active,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

export const supabaseBarbersApi = {
  async getAll(includeInactive = false): Promise<Barber[]> {
    // Fetch users with role 'barber' from the users table
    let url = `${SUPABASE_CONFIG.url}/rest/v1/users?business_id=eq.${BUSINESS_ID}&role=eq.barber&order=name.asc`;
    
    if (!includeInactive) {
      url += '&is_active=eq.true';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch barbers: ${error}`);
    }

    const users: DbUser[] = await response.json();
    return users.map(mapUserToBarber);
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
      const error = await response.text();
      throw new Error(`Failed to fetch barber: ${error}`);
    }

    const data: DbUser[] = await response.json();
    return data.length > 0 ? mapUserToBarber(data[0]) : null;
  },

  async create(barberData: CreateBarberData): Promise<Barber> {
    const payload = {
      business_id: BUSINESS_ID,
      name: barberData.name,
      email: barberData.email || null,
      phone: barberData.phone || null,
      avatar_url: barberData.avatar_url || null,
      bio: barberData.bio || null,
      schedule: barberData.schedule || DEFAULT_SCHEDULE,
      time_off: [],
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
      const error = await response.text();
      throw new Error(`Failed to create barber: ${error}`);
    }

    const data: DbUser[] = await response.json();
    return mapUserToBarber(data[0]);
  },

  async update(barberId: string, updates: UpdateBarberData): Promise<Barber> {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${barberId}&business_id=eq.${BUSINESS_ID}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update barber: ${error}`);
    }

    const data: DbUser[] = await response.json();
    return mapUserToBarber(data[0]);
  },

  async delete(barberId: string): Promise<void> {
    // Soft delete - set is_active to false
    await this.update(barberId, { is_active: false });
  },

  async updateSchedule(barberId: string, schedule: Barber['schedule']): Promise<Barber> {
    return this.update(barberId, { schedule });
  },

  async updateTimeOff(barberId: string, timeOff: Barber['time_off']): Promise<Barber> {
    return this.update(barberId, { time_off: timeOff });
  },
};

export default supabaseBarbersApi;
