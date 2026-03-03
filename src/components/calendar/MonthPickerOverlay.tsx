import { useState, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthPickerOverlayProps {
  currentDate: Date;
  isOpen: boolean;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  onToggle: () => void;
}

export function MonthPickerOverlay({
  currentDate,
  isOpen,
  onDateSelect,
  onClose,
  onToggle,
}: MonthPickerOverlayProps) {
  const [displayMonth, setDisplayMonth] = useState(currentDate);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to trigger month change
  const minSwipeDistance = 50;

  // Update display month when currentDate changes and overlay is closed
  useEffect(() => {
    if (!isOpen) {
      setDisplayMonth(currentDate);
    }
  }, [currentDate, isOpen]);

  // Spanish day abbreviations (Monday first)
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Generate calendar dates (6 weeks = 42 days)
  const generateCalendarDates = (date: Date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dates: Date[] = [];
    let currentDay = calendarStart;

    while (currentDay <= calendarEnd || dates.length < 42) {
      dates.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }

    return dates.slice(0, 42); // Ensure exactly 42 days (6 weeks)
  };

  const calendarDates = generateCalendarDates(displayMonth);

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
    onClose();
  };

  const handlePreviousMonth = () => {
    setDisplayMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth((prev) => addMonths(prev, 1));
  };

  // Touch handlers for swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextMonth();
    } else if (isRightSwipe) {
      handlePreviousMonth();
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'absolute top-full z-50 bg-background border border-border shadow-lg',
        'animate-in slide-in-from-top-2 duration-200',
        // Mobile: full width. Desktop/tablet: compact centered dropdown
        'left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[320px] md:rounded-b-xl'
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="px-4 py-3">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Previous month"
          >
            <ChevronDown className="h-5 w-5 rotate-90" />
          </button>

          <button
            onClick={onToggle}
            className="font-medium text-base flex items-center gap-1 px-3 py-1 rounded-md hover:bg-muted transition-colors"
          >
            <span className="capitalize">
              {format(displayMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Next month"
          >
            <ChevronDown className="h-5 w-5 -rotate-90" />
          </button>
        </div>

        {/* Week Days Row */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Date Grid (6 rows x 7 columns) */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDates.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, displayMonth);
            const isTodayDate = isToday(date);
            const isSelected = isSameDay(date, currentDate);
            const isPast = isBefore(date, startOfDay(new Date())) && !isToday(date);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                className={cn(
                  'aspect-square flex items-center justify-center text-sm rounded-full transition-colors',
                  'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !isCurrentMonth && 'text-muted-foreground opacity-50',
                  isCurrentMonth && !isTodayDate && !isSelected && 'text-foreground',
                  isPast && isCurrentMonth && 'opacity-70',
                  isTodayDate && !isSelected && 'bg-foreground text-background font-medium',
                  isSelected && !isTodayDate && 'ring-2 ring-foreground ring-inset font-medium',
                  isSelected && isTodayDate && 'bg-foreground text-background font-medium'
                )}
              >
                {format(date, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
