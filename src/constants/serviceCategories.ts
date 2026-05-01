export interface ServiceCategoryOption {
  value: string;
  label: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  { value: 'mechas', label: 'Mechas' },
  { value: 'color', label: 'Color' },
  { value: 'cortes', label: 'Cortes' },
  { value: 'lavado', label: 'Lavado' },
  { value: 'peinados', label: 'Peinados' },
  { value: 'tratamientos', label: 'Tratamientos' },
  { value: 'extensiones', label: 'Extensiones' },
  { value: 'maquillaje', label: 'Maquillaje' },
];

export function getCategoryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
