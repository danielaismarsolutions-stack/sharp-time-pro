// Shared color utilities for calendar components
import { useSyncExternalStore } from 'react';
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';
import { ColorClasses } from './types';
import type { TranslationKey } from '@/i18n';

// Single source of truth for the barber color palette.
// Keep entries aligned: classes + hex must describe the SAME color so the
// calendar (which mixes Tailwind classes for appointments and inline hex for
// events) renders consistently for a given barber.
export interface BarberColorOption {
  /** Clave i18n del nombre del color usada por el picker. */
  labelKey: TranslationKey;
  /** Canonical hex (#RRGGBB) stored on the user row when chosen. */
  hex: string;
  /** Tailwind class set used by BookingCard. */
  classes: ColorClasses;
}

export const BARBER_COLOR_PALETTE: BarberColorOption[] = [
  { labelKey: 'barbers.colors.blue',     hex: '#3b82f6', classes: { bg: 'bg-blue-100',    hover: 'hover:bg-blue-200',    text: 'text-blue-900',    border: 'border-l-blue-500' } },
  { labelKey: 'barbers.colors.green',    hex: '#10b981', classes: { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', text: 'text-emerald-900', border: 'border-l-emerald-500' } },
  { labelKey: 'barbers.colors.amber',    hex: '#f59e0b', classes: { bg: 'bg-amber-100',   hover: 'hover:bg-amber-200',   text: 'text-amber-900',   border: 'border-l-amber-500' } },
  { labelKey: 'barbers.colors.rose',     hex: '#f43f5e', classes: { bg: 'bg-rose-100',    hover: 'hover:bg-rose-200',    text: 'text-rose-900',    border: 'border-l-rose-500' } },
  { labelKey: 'barbers.colors.violet',  hex: '#8b5cf6', classes: { bg: 'bg-violet-100',  hover: 'hover:bg-violet-200',  text: 'text-violet-900',  border: 'border-l-violet-500' } },
  { labelKey: 'barbers.colors.magenta',  hex: '#ec4899', classes: { bg: 'bg-pink-100',    hover: 'hover:bg-pink-200',    text: 'text-pink-900',    border: 'border-l-pink-500' } },
  { labelKey: 'barbers.colors.cyan',     hex: '#06b6d4', classes: { bg: 'bg-cyan-100',    hover: 'hover:bg-cyan-200',    text: 'text-cyan-900',    border: 'border-l-cyan-500' } },
  { labelKey: 'barbers.colors.lime',     hex: '#84cc16', classes: { bg: 'bg-lime-100',    hover: 'hover:bg-lime-200',    text: 'text-lime-900',    border: 'border-l-lime-500' } },
];

// Derived arrays kept for backward compatibility with existing callers.
export const pastelColors: ColorClasses[] = BARBER_COLOR_PALETTE.map((p) => p.classes);
export const pastelHexColors: string[] = BARBER_COLOR_PALETTE.map((p) => p.hex);

// Default hex color for entities without an assigned barber
export const DEFAULT_EVENT_HEX = '#d1d5db';

// Map every palette hex (lowercased) to its ColorClasses for O(1) lookup.
const HEX_TO_CLASSES: Record<string, ColorClasses> = BARBER_COLOR_PALETTE.reduce(
  (acc, opt) => {
    acc[opt.hex.toLowerCase()] = opt.classes;
    return acc;
  },
  {} as Record<string, ColorClasses>
);

// Legacy serviceColorMap (extra hexes used by services). Kept for any code
// that still wants to translate a service hex to Tailwind classes.
export const serviceColorMap: Record<string, ColorClasses> = {
  ...HEX_TO_CLASSES,
  '#ef4444': { bg: 'bg-red-100',    hover: 'hover:bg-red-200',    text: 'text-red-900',    border: 'border-l-red-500' },
  '#6366f1': { bg: 'bg-indigo-100', hover: 'hover:bg-indigo-200', text: 'text-indigo-900', border: 'border-l-indigo-500' },
  '#14b8a6': { bg: 'bg-teal-100',   hover: 'hover:bg-teal-200',   text: 'text-teal-900',   border: 'border-l-teal-500' },
  '#f97316': { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', text: 'text-orange-900', border: 'border-l-orange-500' },
};

// Sorted barber list for consistent fallback coloring.
let sortedBarberList: string[] = [];

// Per-barber overrides: barberName -> hex (#RRGGBB). Populated from the
// current business's barbers; cleared/rebuilt on every Calendar load so it
// can never leak across businesses.
let barberColorOverrides: Record<string, string> = {};

// Subscription mechanism so React components that derive memos from the
// barber color state (legends, headers, etc.) can re-render when overrides
// or the sorted list change. Both setters notify; consumers read the version
// via useBarberColorVersion() and put it in their useMemo deps.
let colorStateVersion = 0;
const colorStateListeners = new Set<() => void>();

const notifyColorState = () => {
  colorStateVersion++;
  colorStateListeners.forEach((l) => l());
};

const subscribeColorState = (listener: () => void) => {
  colorStateListeners.add(listener);
  return () => {
    colorStateListeners.delete(listener);
  };
};

const getColorStateVersion = () => colorStateVersion;

/**
 * React hook that returns a number which changes whenever the barber color
 * state changes (sorted list or overrides). Add it to a useMemo dep list
 * to make the memo recompute when colors are updated.
 */
export const useBarberColorVersion = (): number => {
  return useSyncExternalStore(subscribeColorState, getColorStateVersion, getColorStateVersion);
};

export const setBarberList = (barbers: string[]) => {
  const next = [...barbers].sort();
  // Skip notify if nothing changed to avoid useless re-renders.
  if (next.length === sortedBarberList.length && next.every((n, i) => n === sortedBarberList[i])) {
    return;
  }
  sortedBarberList = next;
  notifyColorState();
};

/**
 * Replace the per-barber color override map. Pass an empty object to clear.
 * Only valid palette hex strings are kept; anything else is ignored to
 * prevent malformed values from corrupting the calendar.
 */
export const setBarberColorOverrides = (map: Record<string, string | null | undefined>) => {
  const next: Record<string, string> = {};
  for (const [name, hex] of Object.entries(map)) {
    if (!name || !hex) continue;
    if (typeof hex !== 'string') continue;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) continue;
    next[name] = hex.toLowerCase();
  }
  // Skip notify if the map is structurally identical.
  const prevKeys = Object.keys(barberColorOverrides);
  const nextKeys = Object.keys(next);
  if (
    prevKeys.length === nextKeys.length &&
    nextKeys.every((k) => barberColorOverrides[k] === next[k])
  ) {
    return;
  }
  barberColorOverrides = next;
  notifyColorState();
};

const getOverrideHex = (barberName: string | null | undefined): string | null => {
  if (!barberName) return null;
  return barberColorOverrides[barberName] || null;
};

const getClassesForHex = (hex: string): ColorClasses | null => {
  return HEX_TO_CLASSES[hex.toLowerCase()] || null;
};

const fallbackPastelByName = (barberName: string): ColorClasses => {
  const index = sortedBarberList.indexOf(barberName);
  if (index >= 0) return pastelColors[index % pastelColors.length];
  const hash = barberName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};

const fallbackHexByName = (barberName: string): string => {
  const index = sortedBarberList.indexOf(barberName);
  if (index >= 0) return pastelHexColors[index % pastelHexColors.length];
  const hash = barberName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return pastelHexColors[hash % pastelHexColors.length];
};

// Get pastel color classes for a barber by name.
// Resolution order: explicit override → palette fallback by sorted index.
// This is the single source of truth for "what color does barber X use?"
// in the calendar UI. Use it from legends, headers, filter chips, etc.
export const getBarberPastelColorByName = (barberName: string | null | undefined): ColorClasses => {
  if (!barberName) return pastelColors[0];

  const overrideHex = getOverrideHex(barberName);
  if (overrideHex) {
    const classes = getClassesForHex(overrideHex);
    if (classes) return classes;
  }
  return fallbackPastelByName(barberName);
};

// Get pastel color classes for a booking based on its barber.
export const getBarberPastelColor = (booking: ApiBooking): ColorClasses => {
  return getBarberPastelColorByName(booking.barber);
};

// Legacy function - now redirects to barber-based coloring
export const getServicePastelColor = (booking: ApiBooking, _services: Service[]): ColorClasses => {
  return getBarberPastelColor(booking);
};

// Get the hex color for a barber, mirroring getBarberPastelColor so
// hex-stored events render with the same color as the barber's appointments.
export const getBarberHexColor = (barberName: string | null | undefined): string => {
  if (!barberName) return DEFAULT_EVENT_HEX;
  return getOverrideHex(barberName) || fallbackHexByName(barberName);
};
