import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { pastelColors } from '@/components/calendar/shared/colorUtils';

interface ThreeDayLegendOverlayProps {
  barberNames: string[];
}

export function ThreeDayLegendOverlay({ barberNames }: ThreeDayLegendOverlayProps) {
  // Barber colors for floating legend
  const barberColors = useMemo(() => {
    const sorted = [...barberNames].sort();
    return sorted.map((name, i) => ({
      name,
      colors: pastelColors[i % pastelColors.length],
    }));
  }, [barberNames]);

  // Split barber legend items into balanced rows
  const legendRows = useMemo(() => {
    if (barberColors.length === 0) return [];
    if (barberColors.length <= 3) return [barberColors];
    const firstRowCount = Math.ceil(barberColors.length / 2);
    return [
      barberColors.slice(0, firstRowCount),
      barberColors.slice(firstRowCount),
    ];
  }, [barberColors]);

  if (legendRows.length === 0) return null;

  return (
    <div className="absolute left-12 right-0 top-full z-30 flex justify-center pointer-events-none pt-1.5 px-2">
      <div
        className="rounded-xl px-4 py-1.5 max-w-full pointer-events-auto"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {legendRows.map((row, rowIndex) => (
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
      </div>
    </div>
  );
}
