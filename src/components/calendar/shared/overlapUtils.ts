// Overlap calculation utilities
import { parse } from 'date-fns';
import { ApiBooking } from '@/types/api';
import { OverlapInfo } from './types';

// Check if two bookings overlap
export const doBookingsOverlap = (a: ApiBooking, b: ApiBooking): boolean => {
  const aStart = parse(a.start_time, 'HH:mm:ss', new Date());
  const aEnd = parse(a.end_time, 'HH:mm:ss', new Date());
  const bStart = parse(b.start_time, 'HH:mm:ss', new Date());
  const bEnd = parse(b.end_time, 'HH:mm:ss', new Date());
  return aStart < bEnd && aEnd > bStart;
};

// Calculate horizontal position for overlapping bookings
export const getOverlapInfo = (bookings: ApiBooking[], booking: ApiBooking): OverlapInfo => {
  // Find all bookings that overlap with the current one
  const overlapping = bookings.filter(b => doBookingsOverlap(booking, b));
  // Sort overlapping bookings by start time, then by id for consistency
  overlapping.sort((a, b) => {
    const timeComp = a.start_time.localeCompare(b.start_time);
    return timeComp !== 0 ? timeComp : a.id.localeCompare(b.id);
  });
  const index = overlapping.findIndex(b => b.id === booking.id);
  return { total: overlapping.length, index };
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
