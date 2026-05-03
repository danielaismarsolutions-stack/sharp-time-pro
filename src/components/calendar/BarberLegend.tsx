import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { pastelColors } from './shared/colorUtils';
import { useStaffTerms } from '@/hooks/useStaffTerms';

interface BarberLegendProps {
  barberNames: string[];
  /** When true, renders compact inline layout for floating overlay */
  floating?: boolean;
}

// Get color for a barber based on consistent indexing
const getBarberColor = (barberName: string, allBarbers: string[]) => {
  const index = allBarbers.indexOf(barberName);
  return pastelColors[index % pastelColors.length];
};

export function BarberLegend({ barberNames, floating = false }: BarberLegendProps) {
  const staffTerms = useStaffTerms();
  const barberColors = useMemo(() => {
    const sortedBarbers = [...barberNames].sort();
    return sortedBarbers.map((name) => ({
      name,
      colors: getBarberColor(name, sortedBarbers),
    }));
  }, [barberNames]);

  if (barberNames.length === 0) return null;

  // Floating mode: compact inline chips, no wrapper/border
  if (floating) {
    // Split into balanced rows if many barbers
    const rows = barberColors.length <= 3
      ? [barberColors]
      : [
          barberColors.slice(0, Math.ceil(barberColors.length / 2)),
          barberColors.slice(Math.ceil(barberColors.length / 2)),
        ];

    return (
      <div className="flex flex-col items-center gap-1">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-center gap-3">
            {row.map(({ name, colors }) => (
              <div key={name} className="flex items-center gap-1">
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', colors.bg)} />
                <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">{name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default: bottom bar style
  return (
    <div className="px-2 md:px-4 py-3 border-t border-border bg-card rounded-b-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Colores por {staffTerms.singular}
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
