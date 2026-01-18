import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Service } from '@/types';

interface ServiceLegendProps {
  services: Service[];
}

// Predefined pastel colors for services
const pastelColors = [
  { bg: 'bg-blue-200', text: 'text-blue-900' },
  { bg: 'bg-emerald-200', text: 'text-emerald-900' },
  { bg: 'bg-amber-200', text: 'text-amber-900' },
  { bg: 'bg-rose-200', text: 'text-rose-900' },
  { bg: 'bg-violet-200', text: 'text-violet-900' },
  { bg: 'bg-pink-200', text: 'text-pink-900' },
  { bg: 'bg-cyan-200', text: 'text-cyan-900' },
  { bg: 'bg-lime-200', text: 'text-lime-900' },
];

// Map service colors to pastel classes
const serviceColorMap: Record<string, { bg: string; text: string }> = {
  '#3b82f6': { bg: 'bg-blue-200', text: 'text-blue-900' },
  '#10b981': { bg: 'bg-emerald-200', text: 'text-emerald-900' },
  '#f59e0b': { bg: 'bg-amber-200', text: 'text-amber-900' },
  '#ef4444': { bg: 'bg-red-200', text: 'text-red-900' },
  '#8b5cf6': { bg: 'bg-violet-200', text: 'text-violet-900' },
  '#ec4899': { bg: 'bg-pink-200', text: 'text-pink-900' },
  '#06b6d4': { bg: 'bg-cyan-200', text: 'text-cyan-900' },
  '#84cc16': { bg: 'bg-lime-200', text: 'text-lime-900' },
  '#6366f1': { bg: 'bg-indigo-200', text: 'text-indigo-900' },
  '#14b8a6': { bg: 'bg-teal-200', text: 'text-teal-900' },
  '#f97316': { bg: 'bg-orange-200', text: 'text-orange-900' },
};

// Get pastel color classes for a service
const getServicePastelColor = (service: Service) => {
  if (service.color && serviceColorMap[service.color]) {
    return serviceColorMap[service.color];
  }
  // Fallback: use hash of service name to pick a consistent color
  const hash = (service.name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

// Inline legend component - always visible below the calendar
export function ServiceLegend({ services }: ServiceLegendProps) {
  const serviceColors = useMemo(() => {
    return services.map((service) => ({
      service,
      colors: getServicePastelColor(service),
    }));
  }, [services]);

  if (services.length === 0) return null;

  return (
    <div className="px-2 md:px-4 py-3 border-t border-border bg-card rounded-b-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Colores por servicio
      </p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {serviceColors.map(({ service, colors }) => (
          <div
            key={service.id}
            className={cn(
              'flex items-center px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium',
              colors.bg,
              colors.text
            )}
          >
            <span className="truncate max-w-[80px] sm:max-w-[150px]">
              {service.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Keep MobileServiceLegend as an alias for backwards compatibility
export const MobileServiceLegend = ServiceLegend;
