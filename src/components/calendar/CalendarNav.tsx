import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type CalendarView = 'month' | 'week' | 'day';

interface CalendarNavProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  barbers: string[];
  selectedBarber: string | null;
  onBarberChange: (barber: string | null) => void;
}

export function CalendarNav({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  barbers,
  selectedBarber,
  onBarberChange,
}: CalendarNavProps) {
  const goToPrevious = () => {
    let newDate: Date;
    if (view === 'month') newDate = subMonths(currentDate, 1);
    else if (view === 'week') newDate = subWeeks(currentDate, 1);
    else newDate = subDays(currentDate, 1);
    onDateChange(newDate);
  };

  const goToNext = () => {
    let newDate: Date;
    if (view === 'month') newDate = addMonths(currentDate, 1);
    else if (view === 'week') newDate = addWeeks(currentDate, 1);
    else newDate = addDays(currentDate, 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Check if we're already viewing today
  const isViewingToday = () => {
    const today = new Date();
    if (view === 'day') {
      return isSameDay(currentDate, today);
    }
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return today >= weekStart && today <= weekEnd;
    }
    // Month view - check if same month
    return currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const isTodayDisabled = isViewingToday();

  const getDateLabel = () => {
    if (view === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
    }
    return format(currentDate, "MMMM yyyy", { locale: es });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border bg-card">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant={isTodayDisabled ? "ghost" : "outline"} 
          size="sm" 
          onClick={goToToday}
          disabled={isTodayDisabled}
          className={isTodayDisabled ? "opacity-50 cursor-not-allowed" : ""}
        >
          Hoy
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize ml-2 hidden sm:block">
          {getDateLabel()}
        </h2>
      </div>

      {/* Mobile Date Label */}
      <h2 className="text-base font-semibold capitalize sm:hidden">
        {getDateLabel()}
      </h2>

      {/* Right: View Switcher & Filters */}
      <div className="flex items-center gap-3">
        {/* View Switcher */}
        <Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="month" className="text-xs sm:text-sm">Mes</TabsTrigger>
            <TabsTrigger value="week" className="text-xs sm:text-sm">Semana</TabsTrigger>
            <TabsTrigger value="day" className="text-xs sm:text-sm">Día</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Barber Filter */}
        {barbers.length > 0 && (
          <Select
            value={selectedBarber || 'all'}
            onValueChange={(v) => onBarberChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[140px] sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Barbero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {barbers.map((barber) => (
                <SelectItem key={barber} value={barber}>
                  {barber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
