import { format } from 'date-fns';

interface TimeColumnProps {
  hours: number[];
  currentTime: Date;
  hourHeight: number;
  showCurrentTime: boolean;
  currentTimePosition: number | null;
}

export function TimeColumn({
  hours,
  currentTime,
  hourHeight,
  showCurrentTime,
  currentTimePosition,
}: TimeColumnProps) {
  // Format time for display
  const formatHour = (hour: number) => {
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}${hour < 12 ? 'AM' : 'PM'}`;
  };

  const START_HOUR = 7;

  return (
    <div className="w-12 shrink-0 bg-white relative" style={{ borderRight: '1px solid #e0e0e0' }}>
      {/* Hour labels */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative"
          style={{ height: hourHeight }}
        >
          {hour !== START_HOUR && (
            <span
              className="absolute right-2 text-[11px] text-gray-400 font-normal leading-none"
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                top: 0,
                transform: 'translateY(-50%)',
              }}
            >
              {formatHour(hour)}
            </span>
          )}
        </div>
      ))}

      {/* Current time label */}
      {showCurrentTime && currentTimePosition !== null && (
        <div
          className="absolute z-30 flex items-center justify-end"
          style={{
            top: currentTimePosition,
            transform: 'translateY(-50%)',
            left: 0,
            width: '48px',
            paddingRight: '4px'
          }}
        >
          <span
            className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: '#1a1a1a',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {format(currentTime, 'H:mm')}
          </span>
        </div>
      )}
    </div>
  );
}
