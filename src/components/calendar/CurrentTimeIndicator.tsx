import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface CurrentTimeIndicatorProps {
  currentDate: Date;
  startHour?: number;
  endHour?: number;
  hourHeight: number;
  /** When true, the time label pill is shown on the line (used when there's no separate time column label) */
  showTimeLabel?: boolean;
}

// Get current time in Madrid timezone
const getMadridTime = () => {
  const now = new Date();
  const madridTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  return madridTime;
};

export function CurrentTimeIndicator({
  startHour = 0,
  endHour = 23,
  hourHeight,
  showTimeLabel = true,
}: CurrentTimeIndicatorProps) {
  const [time, setTime] = useState(getMadridTime);

  useEffect(() => {
    setTime(getMadridTime());
    const interval = setInterval(() => {
      setTime(getMadridTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null;

  const top = ((totalMinutes - startMinutes) / 60) * hourHeight;

  return (
    <div
      data-current-time-indicator
      className="absolute left-0 right-0 flex items-center pointer-events-none"
      style={{ top, zIndex: 25 }}
    >
      {/* Dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: '#000000', marginLeft: '-5px' }}
      />
      {/* Line */}
      <div
        className="flex-1 relative"
        style={{ height: '2px', backgroundColor: '#000000' }}
      >
        {/* Time label pill — anchored inside the line so it's never clipped */}
        {showTimeLabel && (
          <span
            className="absolute text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap"
            style={{
              backgroundColor: '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              top: '50%',
              left: '4px',
              transform: 'translateY(-50%)',
              lineHeight: 1,
            }}
          >
            {format(time, 'H:mm')}
          </span>
        )}
      </div>
    </div>
  );
}
