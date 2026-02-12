// Shared color utilities for calendar components
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
import { ColorClasses } from './types';

// Predefined pastel colors for barbers
export const pastelColors: ColorClasses[] = [
  { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-900', border: 'border-l-blue-500' },
  { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', text: 'text-emerald-900', border: 'border-l-emerald-500' },
  { bg: 'bg-amber-100', hover: 'hover:bg-amber-200', text: 'text-amber-900', border: 'border-l-amber-500' },
  { bg: 'bg-rose-100', hover: 'hover:bg-rose-200', text: 'text-rose-900', border: 'border-l-rose-500' },
  { bg: 'bg-violet-100', hover: 'hover:bg-violet-200', text: 'text-violet-900', border: 'border-l-violet-500' },
  { bg: 'bg-pink-100', hover: 'hover:bg-pink-200', text: 'text-pink-900', border: 'border-l-pink-500' },
  { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200', text: 'text-cyan-900', border: 'border-l-cyan-500' },
  { bg: 'bg-lime-100', hover: 'hover:bg-lime-200', text: 'text-lime-900', border: 'border-l-lime-500' },
];

// Map service colors to pastel classes (kept for backwards compatibility)
export const serviceColorMap: Record<string, ColorClasses> = {
  '#3b82f6': { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-900', border: 'border-l-blue-500' },
  '#10b981': { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', text: 'text-emerald-900', border: 'border-l-emerald-500' },
  '#f59e0b': { bg: 'bg-amber-100', hover: 'hover:bg-amber-200', text: 'text-amber-900', border: 'border-l-amber-500' },
  '#ef4444': { bg: 'bg-red-100', hover: 'hover:bg-red-200', text: 'text-red-900', border: 'border-l-red-500' },
  '#8b5cf6': { bg: 'bg-violet-100', hover: 'hover:bg-violet-200', text: 'text-violet-900', border: 'border-l-violet-500' },
  '#ec4899': { bg: 'bg-pink-100', hover: 'hover:bg-pink-200', text: 'text-pink-900', border: 'border-l-pink-500' },
  '#06b6d4': { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200', text: 'text-cyan-900', border: 'border-l-cyan-500' },
  '#84cc16': { bg: 'bg-lime-100', hover: 'hover:bg-lime-200', text: 'text-lime-900', border: 'border-l-lime-500' },
  '#6366f1': { bg: 'bg-indigo-100', hover: 'hover:bg-indigo-200', text: 'text-indigo-900', border: 'border-l-indigo-500' },
  '#14b8a6': { bg: 'bg-teal-100', hover: 'hover:bg-teal-200', text: 'text-teal-900', border: 'border-l-teal-500' },
  '#f97316': { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', text: 'text-orange-900', border: 'border-l-orange-500' },
};

// Sorted barber list for consistent coloring - must be set externally
let sortedBarberList: string[] = [];

// Set the barber list for consistent color assignment
export const setBarberList = (barbers: string[]) => {
  sortedBarberList = [...barbers].sort();
};

// Get pastel color classes for a booking based on its barber
export const getBarberPastelColor = (booking: ApiBooking): ColorClasses => {
  const barberName = booking.barber;
  
  if (!barberName) {
    // Fallback for bookings without barber
    return pastelColors[0];
  }
  
  // Use sorted index for consistent coloring
  const index = sortedBarberList.indexOf(barberName);
  if (index >= 0) {
    return pastelColors[index % pastelColors.length];
  }
  
  // Fallback: hash-based color if barber not in list
  const hash = barberName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

// Legacy function - now redirects to barber-based coloring
export const getServicePastelColor = (booking: ApiBooking, services: Service[]): ColorClasses => {
  return getBarberPastelColor(booking);
};
