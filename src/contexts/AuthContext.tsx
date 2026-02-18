import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPABASE_CONFIG } from '@/config/api';
import { setBusinessId, clearBusinessId } from '@/config/session';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBarber: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fetch user from Supabase users table by email (no business_id filter — determined dynamically)
async function fetchUserByEmail(email: string): Promise<User | null> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,role,business_id`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch user:', await response.text());
    return null;
  }

  const users = await response.json();

  if (users.length === 0) {
    console.warn('No user found with email:', email);
    return null;
  }

  const dbUser = users[0];
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.full_name,
    role: dbUser.role,
    businessId: dbUser.business_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const storedAuth = localStorage.getItem('auth') || sessionStorage.getItem('auth');
        if (storedAuth) {
          const { user, token } = JSON.parse(storedAuth);
          if (user && token) {
            // Verify user still exists and refresh data
            const freshUser = await fetchUserByEmail(user.email);
            if (freshUser) {
              setBusinessId(freshUser.businessId);
              setUser(freshUser);
              // Update stored auth with fresh user data
              const storage = localStorage.getItem('auth') ? localStorage : sessionStorage;
              storage.setItem('auth', JSON.stringify({ user: freshUser, token }));
            } else {
              // User no longer exists, clear auth
              clearBusinessId();
              localStorage.removeItem('auth');
              sessionStorage.removeItem('auth');
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearBusinessId();
        localStorage.removeItem('auth');
        sessionStorage.removeItem('auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, _password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      // Fetch the real user from Supabase users table
      const dbUser = await fetchUserByEmail(email);

      if (!dbUser) {
        throw new Error('Usuario no encontrado. Verifica tu email.');
      }

      // Set the business context for all service calls
      setBusinessId(dbUser.businessId);

      const token = 'session-' + Math.random().toString(36).substring(2);

      console.log('✅ User logged in:', { id: dbUser.id, email: dbUser.email, name: dbUser.name, businessId: dbUser.businessId });
      setUser(dbUser);

      if (rememberMe) {
        localStorage.setItem('auth', JSON.stringify({ user: dbUser, token }));
      } else {
        sessionStorage.setItem('auth', JSON.stringify({ user: dbUser, token }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      console.log('👋 User logged out:', user?.email);
      clearBusinessId();
      setUser(null);
      localStorage.removeItem('auth');
      sessionStorage.removeItem('auth');
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = !!user && (user.role === 'owner' || user.role === 'admin');
  const isBarber = !!user && user.role === 'barber';

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin,
      isBarber,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
