// Y-position → time helpers shared by the calendar grid views (Day, Week, 3-Day).
// Times snap to 15-minute slots. The day's last valid start slot is 23:45, and
// a selection dragged past the bottom of the grid ends at 23:59 (end of day)
// instead of overflowing into "24:00" or wrapping around to "23:00".

export const END_OF_DAY = '23:59';

const SLOT_MINUTES = 15;
const LAST_SLOT_START_MINUTES = 23 * 60 + 45;
const MINUTES_PER_DAY = 24 * 60;

const formatMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const ySnappedMinutes = (y: number, hourHeight: number, startHour: number): number => {
  const hourFloat = startHour + y / hourHeight;
  return Math.round((hourFloat * 60) / SLOT_MINUTES) * SLOT_MINUTES;
};

// Start time of a click or drag selection, clamped to [00:00, 23:45]
export const yToStartTime = (y: number, hourHeight: number, startHour = 0): string => {
  const mins = Math.min(
    Math.max(ySnappedMinutes(y, hourHeight, startHour), 0),
    LAST_SLOT_START_MINUTES
  );
  return formatMinutes(mins);
};

// End time of a drag selection: reaching (or passing) midnight ends the
// selection at 23:59 so it stays within the same day
export const yToEndTime = (y: number, hourHeight: number, startHour = 0): string => {
  const mins = ySnappedMinutes(y, hourHeight, startHour);
  if (mins >= MINUTES_PER_DAY) return END_OF_DAY;
  return formatMinutes(Math.max(mins, 0));
};
