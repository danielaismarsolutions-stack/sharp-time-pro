import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { Locale } from 'date-fns';
import { SUPABASE_CONFIG } from '@/config/api';
import { supabase, getAuthHeaders } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  translate,
  getActiveLanguage,
  setActiveLanguage,
  getDateFnsLocale,
  getIntlLocale,
  isLanguage,
} from '@/i18n';
import type { Language, TranslationKey, TranslationParams } from '@/i18n';

interface LanguageContextType {
  /** Current app language ('es' | 'en'). */
  language: Language;
  /** Persists the language for the whole business in Supabase. Throws on failure. */
  setLanguage: (language: Language) => Promise<void>;
  /** True while the language preference is being saved to Supabase. */
  isSavingLanguage: boolean;
  /** Translate a key with optional `{param}` interpolation. */
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /** date-fns locale matching the current language. */
  dateLocale: Locale;
  /** BCP 47 tag for Intl formatters ('es-ES' | 'en-GB'). */
  intlLocale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Seed from localStorage (kept by setActiveLanguage) so there is no flash
  // of the wrong language while the business preference loads.
  const [language, setLanguageState] = useState<Language>(getActiveLanguage());
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const { user } = useAuth();

  const applyLanguage = useCallback((next: Language) => {
    setActiveLanguage(next);
    setLanguageState(next);
  }, []);

  // Ensure <html lang> and the module-level language reflect the seed value.
  useEffect(() => {
    setActiveLanguage(getActiveLanguage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the business-wide preference from Supabase.
  useEffect(() => {
    if (!user?.businessId) return;
    let cancelled = false;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${user.businessId}&select=language`;
        const res = await fetch(url, { headers });
        if (!res.ok) return; // Column may not exist yet — keep current language
        const rows = await res.json();
        const value = rows?.[0]?.language;
        if (!cancelled && isLanguage(value)) {
          applyLanguage(value);
        }
      } catch {
        // Network error — keep the locally cached language
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.businessId, applyLanguage]);

  // React to language changes made by other users of the same business.
  useEffect(() => {
    if (!user?.businessId) return;

    const channel = supabase
      .channel('business_language_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${user.businessId}`,
        },
        (payload) => {
          const value = (payload.new as Record<string, unknown>).language;
          if (isLanguage(value)) {
            applyLanguage(value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.businessId, applyLanguage]);

  const setLanguage = useCallback(
    async (next: Language) => {
      const previous = getActiveLanguage();
      if (next === previous) return;

      // Optimistic update so the UI switches instantly.
      applyLanguage(next);

      if (!user?.businessId) return; // Not logged in — local preference only

      setIsSavingLanguage(true);
      try {
        const headers = await getAuthHeaders();
        const url = `${SUPABASE_CONFIG.url}/rest/v1/businesses?id=eq.${user.businessId}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ language: next }),
        });
        if (!res.ok) {
          throw new Error(`Failed to save language: ${res.status}`);
        }
      } catch (err) {
        // Revert so the UI reflects what is actually stored.
        applyLanguage(previous);
        throw err;
      } finally {
        setIsSavingLanguage(false);
      }
    },
    [user?.businessId, applyLanguage]
  );

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language]
  );

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      isSavingLanguage,
      t,
      dateLocale: getDateFnsLocale(language),
      intlLocale: getIntlLocale(language),
    }),
    [language, setLanguage, isSavingLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/** Convenience alias — most components only need `t` and the locales. */
export function useTranslation(): LanguageContextType {
  return useLanguage();
}
