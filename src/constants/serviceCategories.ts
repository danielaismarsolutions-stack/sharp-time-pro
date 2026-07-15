import { t } from '@/i18n';
import type { TranslationKey } from '@/i18n';

export interface ServiceCategoryOption {
  value: string;
  label: string;
}

// The `value` slugs are persisted in the database — never change them.
// Visible labels resolve through the i18n dictionary per active language.
export const SERVICE_CATEGORY_LABEL_KEYS: Record<string, TranslationKey> = {
  mechas: 'services.categories.mechas',
  color: 'services.categories.color',
  cortes: 'services.categories.cortes',
  lavado: 'services.categories.lavado',
  peinados: 'services.categories.peinados',
  tratamientos: 'services.categories.tratamientos',
  extensiones: 'services.categories.extensiones',
  maquillaje: 'services.categories.maquillaje',
};

const SERVICE_CATEGORY_VALUES = [
  'mechas',
  'color',
  'cortes',
  'lavado',
  'peinados',
  'tratamientos',
  'extensiones',
  'maquillaje',
] as const;

// Labels are lazy getters so they always reflect the active language.
export const SERVICE_CATEGORIES: ServiceCategoryOption[] = SERVICE_CATEGORY_VALUES.map((value) => ({
  value,
  get label() {
    return t(SERVICE_CATEGORY_LABEL_KEYS[value]);
  },
}));

export function getCategoryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = SERVICE_CATEGORY_LABEL_KEYS[value];
  // Unknown (custom) categories fall back to their raw value.
  return key ? t(key) : value;
}
