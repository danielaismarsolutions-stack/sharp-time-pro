import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPABASE_CONFIG } from '@/config/api';
import { setBusinessId, clearBusinessId } from '@/config/session';
import type { Session } from '@supabase/supabase-js';

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
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fetches the user profile from the `users` table linked to the Supabase Auth user.
 * Tries matching by auth UID first, then falls back to email lookup.
 */
async function fetchUserProfile(authId: string, email: string): Promise<User | null> {
  // Try by auth_uid first (linked accounts)
  let url = `${SUPABASE_CONFIG.url}/rest/v1/users?auth_uid=eq.${encodeURIComponent(authId)}&select=id,email,full_name,role,business_id&limit=1`;

  let response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    const users = await response.json();
    if (users.length > 0) {
      const dbUser = users[0];
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.full_name,
        role: dbUser.role,
        businessId: dbUser.business_id,
      };
    }
  }

  // Fallback: match by email (for users not yet linked by auth_uid)
  url = `${SUPABASE_CONFIG.url}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,role,business_id&limit=1`;

  response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;

  const users = await response.json();
  if (users.length === 0) return null;

  const dbUser = users[0];

  // Link this auth_uid to the profile for future lookups
  await fetch(
    `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${encodeURIComponent(dbUser.id)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auth_uid: authId }),
    },
  );

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.full_name,
    role: dbUser.role,
    businessId: dbUser.business_id,
  };
}

/**
 * Resolves a Supabase Auth session into an app-level User by
 * fetching the linked profile from the `users` table.
 */
async function resolveUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;

  const profile = await fetchUserProfile(session.user.id, session.user.email ?? '');
  if (profile) {
    setBusinessId(profile.businessId);
  }
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Restore session on mount
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const profile = await resolveUser(session);
        setUser(profile);
      } catch (err) {
        clearBusinessId();
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const profile = await resolveUser(session);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          clearBusinessId();
          setUser(null);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, _rememberMe = false) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email o contraseña incorrectos.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        }
        throw new Error(error.message);
      }

      // onAuthStateChange will handle setting the user
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      clearBusinessId();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
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
      updatePassword,
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
