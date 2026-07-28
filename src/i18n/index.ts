import { es as esLocale } from 'date-fns/locale/es';
import { enGB as enGBLocale } from 'date-fns/locale/en-GB';
import type { Locale } from 'date-fns';

import { es } from './locales/es';
import { en } from './locales/en';
import { DEFAULT_LANGUAGE, isLanguage } from './types';
import type { Language, TranslationParams } from './types';

export { DEFAULT_LANGUAGE, LANGUAGES, isLanguage } from './types';
export type { Language, TranslationParams } from './types';

/** Every valid dot-separated key of the translation dictionary, e.g. 'common.save'. */
export type TranslationKey = DotPath<typeof es>;

type DotPath<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPath<T[K]>}`;
}[keyof T & string];

const DICTIONARIES: Record<Language, unknown> = { es, en };

function resolveKey(dictionary: unknown, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const segment of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/**
 * Resolves a translation for the given language. Falls back to Spanish if the
 * key is missing in the requested language, and to the key itself as a last
 * resort so the UI never crashes or renders blank because of a missing string.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslationParams
): string {
  const value =
    resolveKey(DICTIONARIES[language], key) ??
    resolveKey(DICTIONARIES[DEFAULT_LANGUAGE], key);

  if (value === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
    return key;
  }
  return interpolate(value, params);
}

// ── Global active language ─────────────────────────────────────────────────
// Kept in sync by LanguageProvider so that non-React code (services, API
// helpers) can produce localized strings without access to React context.

const LANGUAGE_STORAGE_KEY = 'app_language';

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

let activeLanguage: Language = readStoredLanguage();

export function getActiveLanguage(): Language {
  return activeLanguage;
}

export function setActiveLanguage(language: Language): void {
  activeLanguage = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // localStorage unavailable (private mode, etc.) — in-memory value still works
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

/** Translate with the currently active language. For non-React modules. */
export function t(key: TranslationKey, params?: TranslationParams): string {
  return translate(activeLanguage, key, params);
}

// ── Locale helpers ─────────────────────────────────────────────────────────

/** date-fns locale (enGB keeps Monday as first day of week, like es). */
export function getDateFnsLocale(language: Language): Locale {
  return language === 'en' ? enGBLocale : esLocale;
}

/** BCP 47 tag for Intl formatters (en-GB keeps 24h clock and day-month order). */
export function getIntlLocale(language: Language): string {
  return language === 'en' ? 'en-GB' : 'es-ES';
}
