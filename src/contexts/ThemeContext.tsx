import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type Theme = 'light' | 'dark';

/** Default theme when the user has not chosen one yet. The app historically
 *  rendered with the light palette, so light is the default. */
const DEFAULT_THEME: Theme = 'light';

/** localStorage key — used for an instant, flash-free apply on load before the
 *  Supabase session (source of truth) resolves. */
const STORAGE_KEY = 'nexio-theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Adds/removes the `dark` class on <html>, which drives the CSS variables. */
function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* localStorage unavailable (private mode, etc.) */
  }
  return DEFAULT_THEME;
}

function persistLocal(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage so the UI matches the pre-render inline script.
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // Keep the <html> class in sync with state.
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Source of truth: the logged-in user's saved preference in Supabase Auth
  // metadata. Reconcile on mount and whenever the auth state changes.
  useEffect(() => {
    let active = true;

    const syncFromSession = (metadataTheme: unknown) => {
      if (!active) return;
      if (isTheme(metadataTheme)) {
        setThemeState(metadataTheme);
        persistLocal(metadataTheme);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncFromSession(session?.user?.user_metadata?.theme);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session?.user?.user_metadata?.theme);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    persistLocal(next);
    // Persist per-user in Supabase Auth metadata (best-effort; the local apply
    // above already updated the UI so failures here don't affect the session).
    supabase.auth.updateUser({ data: { theme: next } }).catch(() => {
      /* ignore — preference still applied locally for this session */
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
