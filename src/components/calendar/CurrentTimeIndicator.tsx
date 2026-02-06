import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { isToday } from 'date-fns';

interface CurrentTimeIndicatorProps {
  currentDate: Date;
  startHour?: number;
  endHour?: number;
  hourHeight: number;
}

// Get current time in Madrid timezone
const getMadridTime = () => {
  const now = new Date();
  const madridTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  return madridTime;
};

export function CurrentTimeIndicator({
  currentDate,
  startHour = 8,
  endHour = 21,
  hourHeight,
}: CurrentTimeIndicatorProps) {
  const [time, setTime] = useState(getMadridTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getMadridTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isToday(currentDate)) return null;

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null;

  const top = ((totalMinutes - startMinutes) / 60) * hourHeight;

  return (
    <>
      {/* Time label pill */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{
          top,
          transform: 'translate(-100%, -50%)',
          left: 0,
          paddingRight: '2px',
        }}
      >
        <span
          className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-sm"
          style={{
            backgroundColor: '#1a1a1a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {format(time, 'H:mm')}
        </span>
      </div>

      {/* Dot and line */}
      <div
        className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
        style={{ top }}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: '#1a1a1a', marginLeft: '-4px' }}
        />
        <div
          className="flex-1"
          style={{ height: '1.5px', backgroundColor: '#1a1a1a' }}
        />
      </div>
    </>
  );
}
