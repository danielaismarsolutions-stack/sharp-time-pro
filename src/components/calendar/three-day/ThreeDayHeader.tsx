import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ThreeDayHeaderProps {
  days: Date[];
}

export function ThreeDayHeader({ days }: ThreeDayHeaderProps) {
  return (
    <div className="flex border-b" style={{ borderColor: '#e0e0e0' }}>
      {/* Time column spacer */}
      <div className="w-12 shrink-0" style={{ borderRight: '1px solid #e0e0e0' }} />

      {/* Day columns */}
      {days.map((day) => {
        const dayIsToday = isToday(day);
        return (
          <div
            key={day.toISOString()}
            className="flex-1 py-1.5 flex items-center justify-center gap-1.5"
            style={{ borderRight: '1px solid #e0e0e0' }}
          >
            <span className={cn(
              'w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium',
              dayIsToday ? 'bg-foreground text-background' : 'text-foreground'
            )}>
              {format(day, 'd')}
            </span>
            <span className={cn(
              'text-sm',
              dayIsToday ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {format(day, 'EEE', { locale: es })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
