export type Language = 'es' | 'en';

export const LANGUAGES: readonly Language[] = ['es', 'en'] as const;
export const DEFAULT_LANGUAGE: Language = 'es';

export function isLanguage(value: unknown): value is Language {
  return value === 'es' || value === 'en';
}

/**
 * Maps the Spanish (source-of-truth) dictionary to a shape where every leaf
 * is a string. English dictionaries are typed with this so that a missing or
 * extra key fails at compile time.
 */
export type LocaleShape<T> = {
  [K in keyof T]: T[K] extends string ? string : LocaleShape<T[K]>;
};

/** Values interpolated into `{placeholder}` slots of a translation. */
export type TranslationParams = Record<string, string | number>;
