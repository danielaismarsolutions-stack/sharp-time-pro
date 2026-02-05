import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { pastelColors } from './shared/colorUtils';

interface BarberLegendProps {
  barberNames: string[];
}

// Get color for a barber based on consistent indexing
const getBarberColor = (barberName: string, allBarbers: string[]) => {
  const index = allBarbers.indexOf(barberName);
  return pastelColors[index % pastelColors.length];
};

export function BarberLegend({ barberNames }: BarberLegendProps) {
  const barberColors = useMemo(() => {
    const sortedBarbers = [...barberNames].sort();
    return sortedBarbers.map((name) => ({
      name,
      colors: getBarberColor(name, sortedBarbers),
    }));
  }, [barberNames]);

  if (barberNames.length === 0) return null;

  return (
    <div className="px-2 md:px-4 py-3 border-t border-border bg-card rounded-b-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Colores por barbero
      </p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {barberColors.map(({ name, colors }) => (
          <div
            key={name}
            className={cn(
              'flex items-center px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium',
              colors.bg,
              colors.text
            )}
          >
            <span className="truncate max-w-[80px] sm:max-w-[150px]">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
