// Overlap calculation utilities
import { parse } from 'date-fns';
import { ApiBooking, ApiCalendarEvent } from '@/types/api';
import { OverlapInfo } from './types';

// Generic interface for any item with a time range
interface TimeSlotItem {
  id: string;
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
}

// Check if two time-slot items overlap
export const doTimeSlotsOverlap = (a: TimeSlotItem, b: TimeSlotItem): boolean => {
  const aStart = parse(a.start_time, 'HH:mm:ss', new Date());
  const aEnd = parse(a.end_time, 'HH:mm:ss', new Date());
  const bStart = parse(b.start_time, 'HH:mm:ss', new Date());
  const bEnd = parse(b.end_time, 'HH:mm:ss', new Date());
  return aStart < bEnd && aEnd > bStart;
};

// Check if two bookings overlap
export const doBookingsOverlap = (a: ApiBooking, b: ApiBooking): boolean => {
  return doTimeSlotsOverlap(a, b);
};

// Calculate horizontal position for an item among all overlapping items (bookings + events)
export const getUnifiedOverlapInfo = (allItems: TimeSlotItem[], item: TimeSlotItem): OverlapInfo => {
  const overlapping = allItems.filter(b => doTimeSlotsOverlap(item, b));
  overlapping.sort((a, b) => {
    const timeComp = a.start_time.localeCompare(b.start_time);
    return timeComp !== 0 ? timeComp : a.id.localeCompare(b.id);
  });
  const index = overlapping.findIndex(b => b.id === item.id);
  return { total: overlapping.length, index };
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
