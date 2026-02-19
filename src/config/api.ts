// API Configuration
// Configuration for connecting to the backend

// Supabase Configuration (reads from environment variables)
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL as string,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
};

export const API_CONFIG = {
  // Base URL for the n8n webhook API
  BASE_URL: 'https://n8n2.srv1037212.hstgr.cloud/webhook',
  
  // API Endpoints
  ENDPOINTS: {
    // Bookings
    BOOKINGS: '/bookings',
    BOOKING_BY_ID: (id: string) => `/bookings/${id}`,
    
    // Clients (future)
    CLIENTS: '/clients',
    CLIENT_BY_ID: (id: string) => `/clients/${id}`,
    
    // Services (future)
    SERVICES: '/services',
    SERVICE_BY_ID: (id: string) => `/services/${id}`,
    
    // Settings (future)
    SETTINGS: '/settings',
    BUSINESS_HOURS: '/settings/hours',
    BOOKING_SETTINGS: '/settings/booking',
    NOTIFICATION_SETTINGS: '/settings/notifications',
    
    // Analytics (future)
    ANALYTICS: '/analytics',
    REVENUE: '/analytics/revenue',
  },
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;

export default API_CONFIG;
