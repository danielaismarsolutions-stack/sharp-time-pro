import { useMemo } from 'react';
import { useBusinessBrand, type StaffTerminology } from '@/contexts/BusinessBrandContext';

export interface StaffTerms {
  terminology: StaffTerminology;
  singular: string;          // "barbero" | "estilista"
  singularCap: string;       // "Barbero" | "Estilista"
  plural: string;            // "barberos" | "estilistas"
  pluralCap: string;         // "Barberos" | "Estilistas"
}

const TERMS: Record<StaffTerminology, StaffTerms> = {
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
};

export function useStaffTerms(): StaffTerms {
  const { brand } = useBusinessBrand();
  return useMemo(() => TERMS[brand.staffTerminology], [brand.staffTerminology]);
}
