import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type StaffTerminology = 'barberos' | 'estilistas';

interface BusinessBrand {
  businessName: string;
  logoUrl: string | null;
  staffTerminology: StaffTerminology;
}

interface BusinessBrandContextType {
  brand: BusinessBrand;
  isLoading: boolean;
  updateLogoUrl: (url: string | null) => void;
  updateBusinessName: (name: string) => void;
}

const DEFAULT_STAFF_TERMINOLOGY: StaffTerminology = 'barberos';

function normalizeStaffTerminology(value: unknown): StaffTerminology {
  return value === 'estilistas' ? 'estilistas' : DEFAULT_STAFF_TERMINOLOGY;
}

const defaultBrand: BusinessBrand = {
  businessName: '',
  logoUrl: null,
  staffTerminology: DEFAULT_STAFF_TERMINOLOGY,
};

const BusinessBrandContext = createContext<BusinessBrandContextType | undefined>(undefined);

export function BusinessBrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BusinessBrand>(defaultBrand);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    if (!user?.businessId) {
      setBrand(defaultBrand);
      setIsLoading(false);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${user.businessId}&select=business_name,logo_url,staff_terminology`;
      const res = await fetch(url, { headers });

      if (res.ok) {
        const rows = await res.json();
        if (rows.length > 0) {
          setBrand({
            businessName: rows[0].business_name ?? '',
            logoUrl: rows[0].logo_url ?? null,
            staffTerminology: normalizeStaffTerminology(rows[0].staff_terminology),
          });
        }
      }
    } catch {
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  // Listen for real-time changes to the businesses table
  useEffect(() => {
    if (!user?.businessId) return;

    const channel = supabase
      .channel('business_brand_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${user.businessId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setBrand({
            businessName: (row.business_name as string) ?? '',
            logoUrl: (row.logo_url as string) ?? null,
            staffTerminology: normalizeStaffTerminology(row.staff_terminology),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.businessId]);

  const updateLogoUrl = useCallback((url: string | null) => {
    setBrand((prev) => ({ ...prev, logoUrl: url }));
  }, []);

  const updateBusinessName = useCallback((name: string) => {
    setBrand((prev) => ({ ...prev, businessName: name }));
  }, []);

  return (
    <BusinessBrandContext.Provider value={{ brand, isLoading, updateLogoUrl, updateBusinessName }}>
      {children}
    </BusinessBrandContext.Provider>
  );
}

export function useBusinessBrand() {
  const context = useContext(BusinessBrandContext);
  if (context === undefined) {
    throw new Error('useBusinessBrand must be used within a BusinessBrandProvider');
  }
  return context;
}
