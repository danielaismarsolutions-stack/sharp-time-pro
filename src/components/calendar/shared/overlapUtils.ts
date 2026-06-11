// Overlap calculation utilities
import { parse } from 'date-fns';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { OverlapInfo } from './types';

// Generic interface for any item with a time range
interface TimeSlotItem {
  id: string;
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  barber?: string | null;
}

// Convert an HH:mm(:ss) string to minutes since midnight
const toMinutes = (time: string): number => {
  const [h = '0', m = '0'] = time.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

// Check if two time-slot items overlap
export const doTimeSlotsOverlap = (a: TimeSlotItem, b: TimeSlotItem): boolean => {
  return toMinutes(a.start_time) < toMinutes(b.end_time)
    && toMinutes(a.end_time) > toMinutes(b.start_time);
};

// Check if two bookings overlap
export const doBookingsOverlap = (a: ApiBooking, b: ApiBooking): boolean => {
  return doTimeSlotsOverlap(a, b);
};

interface LayoutEntry {
  item: TimeSlotItem;
  start: number;
  end: number;
}

// Compute a clean, non-overlapping column layout for a set of time-slot items.
//
// Items are grouped into "clusters" of transitively-overlapping items. Within
// each cluster every item is assigned to a column so that:
//   - no two items in the same column overlap in time, and
//   - all items in the cluster share the same total column count.
// This guarantees cards never visually overlap and that their widths line up
// consistently. Columns are filled barber-by-barber (alphabetically) so that
// appointments belonging to the same barber tend to land in the same column.
export const computeOverlapLayout = (items: TimeSlotItem[]): Map<string, OverlapInfo> => {
  const layout = new Map<string, OverlapInfo>();
  if (items.length === 0) return layout;

  const entries: LayoutEntry[] = items.map((item) => ({
    item,
    start: toMinutes(item.start_time),
    end: toMinutes(item.end_time),
  }));

  // Deterministic order: by start, then end, then id
  entries.sort(
    (a, b) =>
      a.start - b.start ||
      a.end - b.end ||
      a.item.id.localeCompare(b.item.id)
  );

  const flushCluster = (cluster: LayoutEntry[]) => {
    if (cluster.length === 0) return;

    // Each column holds the time ranges already placed in it.
    const columns: { start: number; end: number }[][] = [];
    const columnOf = new Map<string, number>();

    // Group the cluster's items by barber so a barber's appointments are
    // assigned together (keeping them aligned in the same column when possible).
    const byBarber = new Map<string, LayoutEntry[]>();
    for (const entry of cluster) {
      const key = entry.item.barber ?? '';
      const group = byBarber.get(key);
      if (group) group.push(entry);
      else byBarber.set(key, [entry]);
    }
    const barberKeys = Array.from(byBarber.keys()).sort();

    for (const key of barberKeys) {
      // Cluster is already sorted by start, so each group stays start-ordered.
      for (const entry of byBarber.get(key)!) {
        let assigned = columns.findIndex((col) =>
          col.every((range) => entry.start >= range.end || entry.end <= range.start)
        );
        if (assigned === -1) {
          assigned = columns.length;
          columns.push([]);
        }
        columns[assigned].push({ start: entry.start, end: entry.end });
        columnOf.set(entry.item.id, assigned);
      }
    }

    const total = columns.length;
    for (const entry of cluster) {
      layout.set(entry.item.id, { total, index: columnOf.get(entry.item.id) ?? 0 });
    }
  };

  let cluster: LayoutEntry[] = [];
  let clusterEnd = -Infinity;
  for (const entry of entries) {
    // A gap (the item starts at/after everything seen so far) closes the cluster.
    if (cluster.length > 0 && entry.start >= clusterEnd) {
      flushCluster(cluster);
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.end);
  }
  flushCluster(cluster);

  return layout;
};

// Cache the computed layout per items-array reference so callers that look up
// one item at a time don't recompute the whole layout on every call.
const layoutCache = new WeakMap<TimeSlotItem[], Map<string, OverlapInfo>>();

// Calculate horizontal position for an item among all overlapping items (bookings + events)
export const getUnifiedOverlapInfo = (allItems: TimeSlotItem[], item: TimeSlotItem): OverlapInfo => {
  let layout = layoutCache.get(allItems);
  if (!layout) {
    layout = computeOverlapLayout(allItems);
    layoutCache.set(allItems, layout);
  }
  return layout.get(item.id) ?? { total: 1, index: 0 };
};

// Calculate horizontal position for overlapping bookings (legacy - delegates to unified)
export const getOverlapInfo = (bookings: ApiBooking[], booking: ApiBooking): OverlapInfo => {
  return getUnifiedOverlapInfo(bookings, booking);
};

// Calculate booking position and height
export const getBookingPosition = (
  booking: ApiBooking, 
  hourHeight: number = 60,
  startHourOffset: number = 8
): { top: number; height: number } => {
  const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
  const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());
  
  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();
  
  const startOffset = (startHour - startHourOffset) * hourHeight + (startMinute / 60) * hourHeight;
  const endOffset = (endHour - startHourOffset) * hourHeight + (endMinute / 60) * hourHeight;
  const height = Math.max(endOffset - startOffset, 32); // Minimum 32px height
  
  return { top: startOffset, height };
};

// Calculate event position (same logic, works with ApiCalendarEvent)
export const getEventPosition = (
  event: ApiCalendarEvent,
  hourHeight: number = 60,
  startHourOffset: number = 8
): { top: number; height: number } => {
  const startTime = parse(event.start_time, 'HH:mm:ss', new Date());
  const endTime = parse(event.end_time, 'HH:mm:ss', new Date());

  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();

  const startOffset = (startHour - startHourOffset) * hourHeight + (startMinute / 60) * hourHeight;
  const endOffset = (endHour - startHourOffset) * hourHeight + (endMinute / 60) * hourHeight;
  const height = Math.max(endOffset - startOffset, 32);

  return { top: startOffset, height };
};
