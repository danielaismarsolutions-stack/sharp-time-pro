// API Client Service
// Connects to the n8n backend API

import { API_CONFIG } from '@/config/api';
import { getBusinessId } from '@/config/session';
import { 
  ApiResponse, 
  ApiBooking, 
  BookingsQueryParams,
  CreateBookingRequest,
  UpdateBookingRequest 
} from '@/types/api';

// ==================== Generic Fetch Wrapper ====================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...API_CONFIG.HEADERS,
      ...options.headers,
    },
  };

  try {
    console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    
    // Handle both wrapped response {success, data} and raw data
    let data: T;
    if (json && typeof json === 'object' && 'success' in json) {
      // Wrapped response format
      if (!json.success) {
        throw new Error(json.error?.message || 'API request failed');
      }
      data = json.data;
    } else {
      // Raw data format (array or object directly)
      data = json;
    }
    
    console.log('✅ API Response:', data);
    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
}

// Helper to ensure data is always an array
function ensureArray<T>(data: T | T[]): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data ? [data] : [];
}

// ==================== Bookings API ====================

export const apiClient = {
  bookings: {
    /**
     * Fetch all bookings with optional filters
     */
    getAll: async (params?: BookingsQueryParams): Promise<ApiBooking[]> => {
      let endpoint = API_CONFIG.ENDPOINTS.BOOKINGS;
      
      // Build query string if params provided
      if (params) {
        const searchParams = new URLSearchParams();
        if (params.date) searchParams.append('date', params.date);
        if (params.status) searchParams.append('status', params.status);
        if (params.client_id) searchParams.append('client_id', params.client_id);
        if (params.start_date) searchParams.append('start_date', params.start_date);
        if (params.end_date) searchParams.append('end_date', params.end_date);
        
        const queryString = searchParams.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }
      
      const data = await fetchApi<ApiBooking | ApiBooking[]>(endpoint);
      return ensureArray(data);
    },

    /**
     * Fetch a specific booking by ID
     */
    getById: async (id: string): Promise<ApiBooking> => {
      const endpoint = API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id);
      return fetchApi<ApiBooking>(endpoint);
    },

    /**
     * Create a new booking (placeholder for future implementation)
     */
    create: async (booking: CreateBookingRequest): Promise<ApiBooking> => {
      const endpoint = API_CONFIG.ENDPOINTS.BOOKINGS;
      return fetchApi<ApiBooking>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          ...booking,
          business_id: getBusinessId(),
        }),
      });
    },

    /**
     * Update an existing booking (placeholder for future implementation)
     */
    update: async (id: string, updates: UpdateBookingRequest): Promise<ApiBooking> => {
      const endpoint = API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id);
      return fetchApi<ApiBooking>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    /**
     * Delete/cancel a booking (placeholder for future implementation)
     */
    delete: async (id: string): Promise<void> => {
      const endpoint = API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id);
      await fetchApi<void>(endpoint, {
        method: 'DELETE',
      });
    },
  },

  // Placeholder for future client endpoints
  clients: {
    getAll: async () => {
      console.warn('⚠️ Clients API not implemented yet');
      return [];
    },
    getById: async (_id: string) => {
      console.warn('⚠️ Clients API not implemented yet');
      return null;
    },
  },

  // Placeholder for future service endpoints
  services: {
    getAll: async () => {
      console.warn('⚠️ Services API not implemented yet');
      return [];
    },
    getById: async (_id: string) => {
      console.warn('⚠️ Services API not implemented yet');
      return null;
    },
  },
};

export default apiClient;
