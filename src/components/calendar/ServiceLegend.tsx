import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Service } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

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

function LegendContent({ serviceColors }: { serviceColors: { service: Service; colors: { bg: string; text: string } }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {serviceColors.map(({ service, colors }) => (
        <div
          key={service.id}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium',
            colors.bg,
            colors.text
          )}
        >
          <span className="truncate max-w-[100px] sm:max-w-[150px]">
            {service.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ServiceLegend({ services }: ServiceLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const serviceColors = useMemo(() => {
    return services.map((service) => ({
      service,
      colors: getServicePastelColor(service),
    }));
  }, [services]);

  if (services.length === 0) return null;

  // Mobile: inline legend (no button)
  if (isMobile) {
    return null; // Will be rendered separately below the calendar
  }

  // Desktop: collapsible button
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-1.5"
        >
          <Palette className="h-4 w-4" />
          <span>Leyenda</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="absolute top-full left-0 right-0 z-20 mt-1">
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 mx-2 md:mx-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Colores por servicio
          </p>
          <LegendContent serviceColors={serviceColors} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Mobile-only inline legend component
export function MobileServiceLegend({ services }: ServiceLegendProps) {
  const isMobile = useIsMobile();

  const serviceColors = useMemo(() => {
    return services.map((service) => ({
      service,
      colors: getServicePastelColor(service),
    }));
  }, [services]);

  if (!isMobile || services.length === 0) return null;

  return (
    <div className="px-2 py-3 border-t border-border bg-card">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Colores por servicio
      </p>
      <div className="flex flex-wrap gap-1.5">
        {serviceColors.map(({ service, colors }) => (
          <div
            key={service.id}
            className={cn(
              'flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium',
              colors.bg,
              colors.text
            )}
          >
            <span className="truncate max-w-[80px]">
              {service.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
