// API Configuration
// Configuration for connecting to the n8n backend

export const API_CONFIG = {
  // Base URL for the n8n webhook API
  BASE_URL: 'https://n8n2.srv1037212.hstgr.cloud/webhook',
  
  // Test business ID (hardcoded for now)
  BUSINESS_ID: '11111111-1111-1111-1111-111111111111',
  
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
