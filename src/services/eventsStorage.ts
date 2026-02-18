// Calendar Events Storage Service
// Uses localStorage for persistence. Structured to easily swap to Supabase later.

import { getBusinessId } from '@/config/session';
import { ApiCalendarEvent, ApiEventRepeat } from '@/types/api';

// ==================== Types ====================

export interface CreateEventData {
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  repeat?: ApiEventRepeat;
  location?: string | null;
  notes?: string | null;
  barber?: string | null;
  color?: string;
}

export interface UpdateEventData {
  name?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  repeat?: ApiEventRepeat;
  location?: string | null;
  notes?: string | null;
  barber?: string | null;
  color?: string;
}

// ==================== Storage Key ====================

function getStorageKey(): string {
  return `sharp-time-pro-events-${getBusinessId()}`;
}

// ==================== Helpers ====================

function generateId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getAllEvents(): ApiCalendarEvent[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllEvents(events: ApiCalendarEvent[]): void {
  localStorage.setItem(getStorageKey(), JSON.stringify(events));
}

// ==================== Events API ====================

export const eventsStorageApi = {
  getAll: async (): Promise<ApiCalendarEvent[]> => {
    return getAllEvents();
  },

  getById: async (eventId: string): Promise<ApiCalendarEvent | null> => {
    const events = getAllEvents();
    return events.find((e) => e.id === eventId) || null;
  },

  create: async (data: CreateEventData): Promise<ApiCalendarEvent> => {
    const events = getAllEvents();
    const now = new Date().toISOString();

    const newEvent: ApiCalendarEvent = {
      id: generateId(),
      business_id: getBusinessId(),
      name: data.name,
      event_date: data.event_date,
      start_time: data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
      end_time: data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time,
      repeat: data.repeat || 'none',
      location: data.location || null,
      notes: data.notes || null,
      barber: data.barber || null,
      color: data.color || '#d1d5db', // default soft grey
      created_at: now,
      updated_at: now,
    };

    events.push(newEvent);
    saveAllEvents(events);
    return newEvent;
  },

  update: async (eventId: string, updates: UpdateEventData): Promise<ApiCalendarEvent> => {
    const events = getAllEvents();
    const index = events.findIndex((e) => e.id === eventId);

    if (index === -1) {
      throw new Error('Event not found');
    }

    const updated: ApiCalendarEvent = {
      ...events[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Normalize time formats
    if (updated.start_time.length === 5) updated.start_time += ':00';
    if (updated.end_time.length === 5) updated.end_time += ':00';

    events[index] = updated;
    saveAllEvents(events);
    return updated;
  },

  delete: async (eventId: string): Promise<void> => {
    const events = getAllEvents();
    const filtered = events.filter((e) => e.id !== eventId);
    saveAllEvents(filtered);
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<ApiCalendarEvent[]> => {
    const events = getAllEvents();
    return events.filter(
      (e) => e.event_date >= startDate && e.event_date <= endDate
    );
  },
};

export default eventsStorageApi;
