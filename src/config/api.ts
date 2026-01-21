// API Configuration
// Configuration for connecting to the backend

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: 'https://omeeupvetsacxbgojifx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZWV1cHZldHNhY3hiZ29qaWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NjYyMDEsImV4cCI6MjA1MjQ0MjIwMX0.pXXWf4lZ_CtCPwOWlOI69oqzqkx-9JVFc0wV4VJmg9E',
};

// Business ID for the barbershop
export const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

export const API_CONFIG = {
  // Base URL for the n8n webhook API
  BASE_URL: 'https://n8n2.srv1037212.hstgr.cloud/webhook',
  
  // Test business ID (hardcoded for now)
  BUSINESS_ID: BUSINESS_ID,
  
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
