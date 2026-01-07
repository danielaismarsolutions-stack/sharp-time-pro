// API Service Layer
// Currently uses mock data - ready to swap to n8n endpoints

import { Booking, Client, Service, BusinessSettings, BusinessHours, BookingSettings, NotificationSettings, AnalyticsData } from '@/types';
import { mockBookings, mockClients, mockServices, mockBusinessSettings, mockBusinessHours, mockBookingSettings, mockNotificationSettings, mockAnalytics } from '@/data/mockData';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_DELAY = 300;

// In-memory data stores (simulating database)
let bookings = [...mockBookings];
let clients = [...mockClients];
let services = [...mockServices];
let businessSettings = { ...mockBusinessSettings };
let businessHours = { ...mockBusinessHours };
let bookingSettings = { ...mockBookingSettings };
let notificationSettings = { ...mockNotificationSettings };

// When ready for n8n, replace these with actual fetch calls:
// const API_BASE = 'https://your-n8n-instance.com/webhook';

// ==================== BOOKINGS ====================

export const bookingsApi = {
  getAll: async (filters?: { date?: string; status?: string; clientId?: string }): Promise<Booking[]> => {
    await delay(API_DELAY);
    let result = [...bookings];
    
    if (filters?.date) {
      result = result.filter(b => b.date === filters.date);
    }
    if (filters?.status) {
      result = result.filter(b => b.status === filters.status);
    }
    if (filters?.clientId) {
      result = result.filter(b => b.clientId === filters.clientId);
    }
    
    return result;
  },

  getById: async (id: string): Promise<Booking | null> => {
    await delay(API_DELAY);
    return bookings.find(b => b.id === id) || null;
  },

  create: async (booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> => {
    await delay(API_DELAY);
    const newBooking: Booking = {
      ...booking,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };
    bookings.push(newBooking);
    return newBooking;
  },

  update: async (id: string, updates: Partial<Booking>): Promise<Booking> => {
    await delay(API_DELAY);
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Booking not found');
    
    bookings[index] = { ...bookings[index], ...updates };
    return bookings[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(API_DELAY);
    bookings = bookings.filter(b => b.id !== id);
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<Booking[]> => {
    await delay(API_DELAY);
    return bookings.filter(b => b.date >= startDate && b.date <= endDate);
  },
};

// ==================== CLIENTS ====================

export const clientsApi = {
  getAll: async (search?: string): Promise<Client[]> => {
    await delay(API_DELAY);
    if (!search) return [...clients];
    
    const searchLower = search.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower) ||
      c.phone.includes(search)
    );
  },

  getById: async (id: string): Promise<Client | null> => {
    await delay(API_DELAY);
    return clients.find(c => c.id === id) || null;
  },

  create: async (client: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent' | 'lastVisit'>): Promise<Client> => {
    await delay(API_DELAY);
    const newClient: Client = {
      ...client,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString().split('T')[0],
      totalVisits: 0,
      totalSpent: 0,
      lastVisit: null,
    };
    clients.push(newClient);
    return newClient;
  },

  update: async (id: string, updates: Partial<Client>): Promise<Client> => {
    await delay(API_DELAY);
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Client not found');
    
    clients[index] = { ...clients[index], ...updates };
    return clients[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(API_DELAY);
    clients = clients.filter(c => c.id !== id);
  },

  getBookingHistory: async (clientId: string): Promise<Booking[]> => {
    await delay(API_DELAY);
    return bookings
      .filter(b => b.clientId === clientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
};

// ==================== SERVICES ====================

export const servicesApi = {
  getAll: async (includeInactive = false): Promise<Service[]> => {
    await delay(API_DELAY);
    if (includeInactive) return [...services];
    return services.filter(s => s.isActive);
  },

  getById: async (id: string): Promise<Service | null> => {
    await delay(API_DELAY);
    return services.find(s => s.id === id) || null;
  },

  create: async (service: Omit<Service, 'id'>): Promise<Service> => {
    await delay(API_DELAY);
    const newService: Service = {
      ...service,
      id: Math.random().toString(36).substring(2, 11),
    };
    services.push(newService);
    return newService;
  },

  update: async (id: string, updates: Partial<Service>): Promise<Service> => {
    await delay(API_DELAY);
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Service not found');
    
    services[index] = { ...services[index], ...updates };
    return services[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(API_DELAY);
    services = services.filter(s => s.id !== id);
  },
};

// ==================== SETTINGS ====================

export const settingsApi = {
  getBusinessSettings: async (): Promise<BusinessSettings> => {
    await delay(API_DELAY);
    return { ...businessSettings };
  },

  updateBusinessSettings: async (updates: Partial<BusinessSettings>): Promise<BusinessSettings> => {
    await delay(API_DELAY);
    businessSettings = { ...businessSettings, ...updates };
    return businessSettings;
  },

  getBusinessHours: async (): Promise<BusinessHours> => {
    await delay(API_DELAY);
    return { ...businessHours };
  },

  updateBusinessHours: async (updates: BusinessHours): Promise<BusinessHours> => {
    await delay(API_DELAY);
    businessHours = { ...updates };
    return businessHours;
  },

  getBookingSettings: async (): Promise<BookingSettings> => {
    await delay(API_DELAY);
    return { ...bookingSettings };
  },

  updateBookingSettings: async (updates: Partial<BookingSettings>): Promise<BookingSettings> => {
    await delay(API_DELAY);
    bookingSettings = { ...bookingSettings, ...updates };
    return bookingSettings;
  },

  getNotificationSettings: async (): Promise<NotificationSettings> => {
    await delay(API_DELAY);
    return { ...notificationSettings };
  },

  updateNotificationSettings: async (updates: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    await delay(API_DELAY);
    notificationSettings = { ...notificationSettings, ...updates };
    return notificationSettings;
  },
};

// ==================== ANALYTICS ====================

export const analyticsApi = {
  getAnalytics: async (): Promise<AnalyticsData> => {
    await delay(API_DELAY);
    return { ...mockAnalytics };
  },

  getRevenueByPeriod: async (period: 'week' | 'month' | 'year'): Promise<number> => {
    await delay(API_DELAY);
    switch (period) {
      case 'week': return mockAnalytics.revenue.thisWeek;
      case 'month': return mockAnalytics.revenue.thisMonth;
      case 'year': return mockAnalytics.revenue.thisYear;
    }
  },
};

// ==================== AUTH (Mock) ====================

export const authApi = {
  login: async (email: string, _password: string): Promise<{ user: { id: string; email: string; name: string }; token: string }> => {
    await delay(500);
    // Mock login - accepts any credentials
    return {
      user: {
        id: 'user-1',
        email,
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      },
      token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
    };
  },

  logout: async (): Promise<void> => {
    await delay(200);
  },

  getCurrentUser: async (): Promise<{ id: string; email: string; name: string } | null> => {
    await delay(200);
    const stored = localStorage.getItem('auth');
    if (stored) {
      const { user } = JSON.parse(stored);
      return user;
    }
    return null;
  },
};
