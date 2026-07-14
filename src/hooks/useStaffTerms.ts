import { useMemo } from 'react';
import { useBusinessBrand, type StaffTerminology } from '@/contexts/BusinessBrandContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n';

export interface StaffTerms {
  terminology: StaffTerminology;
  singular: string;          // "barbero" | "estilista" | "barber" | "stylist"
  singularCap: string;       // "Barbero" | "Estilista" | "Barber" | "Stylist"
  plural: string;            // "barberos" | "estilistas" | "barbers" | "stylists"
  pluralCap: string;         // "Barberos" | "Estilistas" | "Barbers" | "Stylists"
}

const TERMS: Record<Language, Record<StaffTerminology, StaffTerms>> = {
  es: {
    barberos: {
      terminology: 'barberos',
      singular: 'barbero',
      singularCap: 'Barbero',
      plural: 'barberos',
      pluralCap: 'Barberos',
    },
    estilistas: {
      terminology: 'estilistas',
      singular: 'estilista',
      singularCap: 'Estilista',
      plural: 'estilistas',
      pluralCap: 'Estilistas',
    },
  },
  en: {
    barberos: {
      terminology: 'barberos',
      singular: 'barber',
      singularCap: 'Barber',
      plural: 'barbers',
      pluralCap: 'Barbers',
    },
    estilistas: {
      terminology: 'estilistas',
      singular: 'stylist',
      singularCap: 'Stylist',
      plural: 'stylists',
      pluralCap: 'Stylists',
    },
  },
};

export function getStaffTerms(terminology: StaffTerminology, language: Language): StaffTerms {
  return TERMS[language][terminology];
}

export function useStaffTerms(): StaffTerms {
  const { brand } = useBusinessBrand();
  const { language } = useLanguage();
  return useMemo(
    () => TERMS[language][brand.staffTerminology],
    [brand.staffTerminology, language]
  );
}
