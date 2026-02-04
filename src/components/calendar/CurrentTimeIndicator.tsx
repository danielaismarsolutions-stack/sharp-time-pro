import { useEffect, useState } from 'react';
import { isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CurrentTimeIndicatorProps {
  currentDate: Date;
  startHour?: number; // Default 8
  endHour?: number;   // Default 21
  hourHeight: number; // pixels per hour
}

// Get current time in Madrid timezone
const getMadridTime = () => {
  const now = new Date();
  const madridTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  return {
    hours: madridTime.getHours(),
    minutes: madridTime.getMinutes(),
  };
};

export function CurrentTimeIndicator({
  currentDate,
  startHour = 8,
  endHour = 21,
  hourHeight,
}: CurrentTimeIndicatorProps) {
  const isMobile = useIsMobile();
  const [time, setTime] = useState(getMadridTime);

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getMadridTime());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Only show if viewing today
  if (!isToday(currentDate)) {
    return null;
  }

  const { hours, minutes } = time;
  
  // Check if current time is within displayed hours
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  
  if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
    return null;
  }

  // Calculate position from start hour
  const minutesFromStart = totalMinutes - startMinutes;
  const top = (minutesFromStart / 60) * hourHeight;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top }}
    >
      {/* Circle indicator */}
      <div
        className={cn(
          'absolute rounded-full bg-red-500',
          isMobile ? 'w-1.5 h-1.5 -left-0.5' : 'w-2 h-2 -left-1'
        )}
        style={{ 
          top: isMobile ? '-2px' : '-3px',
          boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
        }}
      />
      
      {/* Horizontal line */}
      <div
        className={cn(
          'w-full bg-red-500/80',
          isMobile ? 'h-[1.5px]' : 'h-[2px]'
        )}
        style={{
          boxShadow: '0 0 4px rgba(239, 68, 68, 0.3)'
        }}
      />
    </div>
  );
}
