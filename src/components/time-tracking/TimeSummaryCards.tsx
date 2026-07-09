import { Clock, CalendarDays, CalendarRange } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TimeEntry } from '@/types/timeEntry';

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function getStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeMinutes(entries: TimeEntry[], since: Date): number {
  return entries
    .filter((e) => new Date(e.clock_in) >= since)
    .reduce((sum, e) => {
      if (e.duration_minutes) return sum + e.duration_minutes;
      // If still open, compute live duration
      if (e.status === 'open') {
        return sum + Math.floor((Date.now() - new Date(e.clock_in).getTime()) / 60_000);
      }
      return sum;
    }, 0);
}

interface TimeSummaryCardsProps {
  entries: TimeEntry[];
}

export default function TimeSummaryCards({ entries }: TimeSummaryCardsProps) {
  const todayMinutes = computeMinutes(entries, getStartOfDay());
  const weekMinutes = computeMinutes(entries, getStartOfWeek());
  const monthMinutes = computeMinutes(entries, getStartOfMonth());

  const cards = [
    { label: 'Hoy', value: formatHours(todayMinutes), icon: Clock, color: 'text-blue-500' },
    { label: 'Esta semana', value: formatHours(weekMinutes), icon: CalendarDays, color: 'text-green-500' },
    { label: 'Este mes', value: formatHours(monthMinutes), icon: CalendarRange, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-3 md:p-4 text-center">
            <c.icon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
            <p className="text-base min-[400px]:text-lg md:text-xl font-bold whitespace-nowrap">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
