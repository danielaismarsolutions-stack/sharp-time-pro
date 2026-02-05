import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Menu, ChevronDown, Bell, List, LayoutGrid, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { MonthPickerOverlay } from './MonthPickerOverlay';

type ViewMode = 'day' | '3day' | 'week' | 'month' | 'agenda';

interface SetmoreHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  barberNames: string[];
  selectedBarber: string | null;
  onBarberChange: (barber: string | null) => void;
}

export function SetmoreHeader({
  currentDate,
  onDateChange,
  onMenuClick,
  onNotificationClick,
  viewMode,
  onViewModeChange,
  barberNames,
  selectedBarber,
  onBarberChange,
}: SetmoreHeaderProps) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Get user initials
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Generate week days starting from Monday of current week
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Spanish day abbreviations
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const handleDayClick = (date: Date) => {
    onDateChange(date);
  };

  const handleMonthSelect = (date: Date) => {
    onDateChange(date);
    setIsMonthPickerOpen(false);
  };

  const toggleMonthPicker = () => {
    setIsMonthPickerOpen(!isMonthPickerOpen);
  };

  return (
    <div className="bg-background border-b border-border sticky top-0 z-30">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Hamburger menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Center: Month/Year with dropdown */}
        <Button
          variant="ghost"
          onClick={toggleMonthPicker}
          className="font-medium text-base md:text-lg gap-1 px-2"
        >
          <span className="capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 opacity-60 transition-transform duration-200",
            isMonthPickerOpen && "rotate-180"
          )} />
        </Button>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationClick}
            className="h-10 w-10 relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-foreground text-background text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Month Picker Overlay */}
      <MonthPickerOverlay
        currentDate={currentDate}
        isOpen={isMonthPickerOpen}
        onDateSelect={handleMonthSelect}
        onClose={() => setIsMonthPickerOpen(false)}
        onToggle={toggleMonthPicker}
      />

      {/* Week day strip */}
      <div className="flex items-center justify-around px-2 py-2 overflow-x-auto scrollbar-hide">
        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);
          const dateNumber = format(day, 'd');

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[40px] py-1 px-2 rounded-lg transition-colors',
                'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              {/* Day letter */}
              <span
                className={cn(
                  'text-xs font-medium mb-1',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {dayLabels[index]}
              </span>
              
              {/* Date number */}
              <span
                className={cn(
                  'flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full transition-colors',
                  isSelected && 'bg-foreground text-background',
                  isToday && !isSelected && 'ring-2 ring-foreground ring-inset',
                  !isSelected && !isToday && 'text-foreground'
                )}
              >
                {dateNumber}
              </span>
            </button>
          );
        })}
      </div>

      {/* View Switcher + Barber Filter Row */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList className="h-9">
            <TabsTrigger value="agenda" className="text-xs px-2 min-h-[40px]">
              <List className="h-4 w-4 mr-1" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="day" className="text-xs px-2 min-h-[40px]">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Día
            </TabsTrigger>
            <TabsTrigger value="3day" className="text-xs px-2 min-h-[40px]">
              <CalendarIcon className="h-4 w-4 mr-1" />
              3 Días
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Barber Filter */}
        {barberNames.length > 0 && (
          <Select
            value={selectedBarber || 'all'}
            onValueChange={(v) => onBarberChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[100px] h-9">
              <Filter className="h-4 w-4 mr-1 shrink-0" />
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {barberNames.map((barberName) => (
                <SelectItem key={barberName} value={barberName}>
                  {barberName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
