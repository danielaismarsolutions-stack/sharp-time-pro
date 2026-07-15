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
  setMonth,
  getMonth,
  getYear,
  addYears,
  subYears,
} from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface MonthPickerOverlayProps {
  currentDate: Date;
  isOpen: boolean;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  onToggle: () => void;
  toggleButtonRef?: React.RefObject<HTMLButtonElement>;
}

export function MonthPickerOverlay({
  currentDate,
  isOpen,
  onDateSelect,
  onClose,
  onToggle,
  toggleButtonRef,
}: MonthPickerOverlayProps) {
  const { t, dateLocale } = useTranslation();
  const MONTH_LABELS = t('calendar.monthPicker.monthsShort').split(',');
  const [displayMonth, setDisplayMonth] = useState(currentDate);
  const [showYearView, setShowYearView] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to trigger month change
  const minSwipeDistance = 50;

  // Update display month when currentDate changes and overlay is closed
  useEffect(() => {
    if (!isOpen) {
      setDisplayMonth(currentDate);
      setShowYearView(false);
    }
  }, [currentDate, isOpen]);

  // Single-letter day abbreviations (Monday first)
  const dayLabels = t('calendar.monthPicker.dayLetters').split(',');

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

  const handleMonthSelect = (monthIndex: number) => {
    setDisplayMonth((prev) => setMonth(prev, monthIndex));
    setShowYearView(false);
  };

  const handlePreviousYear = () => {
    setDisplayMonth((prev) => subYears(prev, 1));
  };

  const handleNextYear = () => {
    setDisplayMonth((prev) => addYears(prev, 1));
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
      showYearView ? handleNextYear() : handleNextMonth();
    } else if (isRightSwipe) {
      showYearView ? handlePreviousYear() : handlePreviousMonth();
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Ignore clicks on the toggle button — let the toggle handler manage it
      if (toggleButtonRef?.current && toggleButtonRef.current.contains(target)) {
        return;
      }
      if (overlayRef.current && !overlayRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, toggleButtonRef]);

  if (!isOpen) return null;

  const displayYear = getYear(displayMonth);
  const displayMonthIndex = getMonth(displayMonth);
  const currentMonthIndex = getMonth(new Date());
  const currentYear = getYear(new Date());

  return (
    <div
      ref={overlayRef}
      className={cn(
        'absolute top-full left-0 right-0 z-50 bg-background border-b border-border shadow-lg',
        'animate-in slide-in-from-top-2 duration-200',
        'md:left-1/2 md:-translate-x-1/2 md:w-[360px] md:rounded-b-xl md:shadow-xl md:border md:border-t-0'
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="px-4 py-3">
        {showYearView ? (
          <>
            {/* Year Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePreviousYear}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label={t('calendar.monthPicker.prevYear')}
              >
                <ChevronDown className="h-5 w-5 rotate-90" />
              </button>

              <button
                onClick={() => setShowYearView(false)}
                className="font-medium text-base flex items-center gap-1 px-3 py-1 rounded-md hover:bg-muted transition-colors"
              >
                <span>{displayYear}</span>
                <ChevronDown className="h-4 w-4 opacity-60 rotate-180" />
              </button>

              <button
                onClick={handleNextYear}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label={t('calendar.monthPicker.nextYear')}
              >
                <ChevronDown className="h-5 w-5 -rotate-90" />
              </button>
            </div>

            {/* Month Grid (4x3) */}
            <div className="grid grid-cols-3 gap-2">
              {MONTH_LABELS.map((label, index) => {
                const isCurrentMonth = index === currentMonthIndex && displayYear === currentYear;
                const isDisplayedMonth = index === displayMonthIndex;

                return (
                  <button
                    key={label}
                    onClick={() => handleMonthSelect(index)}
                    className={cn(
                      'py-3 rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isCurrentMonth && !isDisplayedMonth && 'bg-foreground text-background',
                      isDisplayedMonth && !isCurrentMonth && 'ring-2 ring-foreground ring-inset',
                      isDisplayedMonth && isCurrentMonth && 'bg-foreground text-background',
                      !isCurrentMonth && !isDisplayedMonth && 'text-foreground'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Month/Year Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label={t('calendar.monthPicker.prevMonth')}
              >
                <ChevronDown className="h-5 w-5 rotate-90" />
              </button>

              <button
                onClick={() => setShowYearView(true)}
                className="font-medium text-base flex items-center gap-1 px-3 py-1 rounded-md hover:bg-muted transition-colors"
              >
                <span className="capitalize">
                  {format(displayMonth, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label={t('calendar.monthPicker.nextMonth')}
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
                      'w-9 h-9 mx-auto flex items-center justify-center text-sm rounded-full transition-colors',
                      'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      // Previous/next month dates
                      !isCurrentMonth && 'text-muted-foreground opacity-50',
                      // Current month dates
                      isCurrentMonth && !isTodayDate && !isSelected && 'text-foreground',
                      // Past dates (slightly lighter)
                      isPast && isCurrentMonth && 'opacity-70',
                      // Today: filled circle with white text
                      isTodayDate && !isSelected && 'bg-foreground text-background font-medium',
                      // Selected date (if different from today): ring/outline
                      isSelected && !isTodayDate && 'ring-2 ring-foreground ring-inset font-medium',
                      // If both today and selected
                      isSelected && isTodayDate && 'bg-foreground text-background font-medium'
                    )}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
