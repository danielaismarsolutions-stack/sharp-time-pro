import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClientsApi, ClientWithBookings } from '@/services/supabaseClients';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { supabaseBookingsApi } from '@/services/supabaseBookings';
import { supabaseBusinessHoursApi } from '@/services/supabaseBusinessHours';
import { supabaseBusinessesApi } from '@/services/supabaseBusinesses';
import { supabaseConsultationsApi } from '@/services/supabaseConsultations';
import { supabaseTimeEntriesApi } from '@/services/supabaseTimeEntries';
import { stripeBillingApi, type BillingInfo } from '@/services/stripeBilling';
import type { Client, Service, BusinessHours } from '@/types';
import type { Barber } from '@/types/barber';
import type { ApiBooking } from '@/types/api';
import type { Consultation } from '@/types/consultation';
import type { TimeEntry, TimeEntryFilters, TimeEntryCorrectionData } from '@/types/timeEntry';

// ── Query Keys (centralized for invalidation) ──────────────────────────

export const queryKeys = {
  clients: ['clients'] as const,
  clientDetail: (id: string) => ['clients', id] as const,
  services: (includeInactive?: boolean) => ['services', { includeInactive }] as const,
  barbers: (includeInactive?: boolean) => ['barbers', { includeInactive }] as const,
  bookings: (filters?: Record<string, string>) => ['bookings', filters ?? {}] as const,
  businessHours: ['businessHours'] as const,
  businessSettings: ['businessSettings'] as const,
  bookingSettings: ['bookingSettings'] as const,
  notificationSettings: ['notificationSettings'] as const,
  consultations: ['consultations'] as const,
  timeTrackingSettings: ['timeTrackingSettings'] as const,
  activeSession: (userId: string) => ['timeEntries', 'active', userId] as const,
  activeSessions: ['timeEntries', 'active'] as const,
  timeEntries: (filters?: TimeEntryFilters) => ['timeEntries', filters ?? {}] as const,
  billing: ['billing'] as const,
};

// ── Clients ─────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery<Client[]>({
    queryKey: queryKeys.clients,
    queryFn: () => supabaseClientsApi.getAll(),
  });
}

export function useClientDetail(id: string | undefined) {
  return useQuery<ClientWithBookings | null>({
    queryKey: queryKeys.clientDetail(id!),
    queryFn: () => supabaseClientsApi.getWithBookings(id!),
    enabled: !!id,
  });
}

// ── Services ────────────────────────────────────────────────────────────

export function useServices(includeInactive = true) {
  return useQuery<Service[]>({
    queryKey: queryKeys.services(includeInactive),
    queryFn: () => supabaseServicesApi.getAll(includeInactive),
  });
}

// ── Barbers ─────────────────────────────────────────────────────────────

export function useBarbers(includeInactive = false) {
  return useQuery<Barber[]>({
    queryKey: queryKeys.barbers(includeInactive),
    queryFn: () => supabaseBarbersApi.getAll(includeInactive),
  });
}

// ── Bookings ────────────────────────────────────────────────────────────

export function useBookings(filters?: { start_date?: string; end_date?: string; client_id?: string }) {
  return useQuery<ApiBooking[]>({
    queryKey: queryKeys.bookings(filters as Record<string, string>),
    queryFn: () => supabaseBookingsApi.getAll(filters),
  });
}

// ── Business Hours ──────────────────────────────────────────────────────

export function useBusinessHours() {
  return useQuery<BusinessHours>({
    queryKey: queryKeys.businessHours,
    queryFn: () => supabaseBusinessHoursApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 min — rarely changes
  });
}

// ── Business Settings ───────────────────────────────────────────────────

export function useBusinessSettings() {
  return useQuery({
    queryKey: queryKeys.businessSettings,
    queryFn: () => supabaseBusinessesApi.get(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBookingSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.bookingSettings,
    queryFn: () => supabaseBusinessesApi.getBookingSettings(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: () => supabaseBusinessesApi.getNotificationSettings(),
    staleTime: 1000 * 60 * 5,
  });
}

// ── Consultations ───────────────────────────────────────────────────────

export function useConsultations() {
  return useQuery<Consultation[]>({
    queryKey: queryKeys.consultations,
    queryFn: () => supabaseConsultationsApi.getAll(),
  });
}

// ── Time Tracking Settings ──────────────────────────────────────────────

export function useTimeTrackingSettings() {
  return useQuery<{ timeTrackingEnabled: boolean }>({
    queryKey: queryKeys.timeTrackingSettings,
    queryFn: () => supabaseBusinessesApi.getTimeTrackingSettings(),
    staleTime: 1000 * 60 * 5,
  });
}

// ── Time Entries ────────────────────────────────────────────────────────

export function useActiveSession(userId: string | undefined) {
  return useQuery<TimeEntry | null>({
    queryKey: queryKeys.activeSession(userId!),
    queryFn: () => supabaseTimeEntriesApi.getOpenSession(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useActiveSessions() {
  return useQuery<TimeEntry[]>({
    queryKey: queryKeys.activeSessions,
    queryFn: () => supabaseTimeEntriesApi.getActiveSessions(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useTimeEntries(filters?: TimeEntryFilters) {
  return useQuery<TimeEntry[]>({
    queryKey: queryKeys.timeEntries(filters),
    queryFn: () => supabaseTimeEntriesApi.getByFilters(filters),
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, notes }: { userId: string; notes?: string }) =>
      supabaseTimeEntriesApi.clockIn(userId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, notes }: { entryId: string; notes?: string }) =>
      supabaseTimeEntriesApi.clockOut(entryId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useCorrectTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, correctedById, data }: { entryId: string; correctedById: string; data: TimeEntryCorrectionData }) =>
      supabaseTimeEntriesApi.correctEntry(entryId, correctedById, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => supabaseTimeEntriesApi.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

// ── Billing ────────────────────────────────────────────────────────────

export function useBillingInfo(enabled = true) {
  return useQuery<BillingInfo>({
    queryKey: queryKeys.billing,
    queryFn: () => stripeBillingApi.getBillingInfo(),
    staleTime: 1000 * 60, // 1 min
    enabled,
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: () => stripeBillingApi.createCheckoutSession(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () => stripeBillingApi.createPortalSession(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}

// ── Invalidation helper ─────────────────────────────────────────────────

export function useInvalidateQuery() {
  const queryClient = useQueryClient();

  return {
    invalidateClients: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    invalidateServices: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    invalidateBarbers: () => queryClient.invalidateQueries({ queryKey: ['barbers'] }),
    invalidateBookings: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    invalidateBusinessHours: () => queryClient.invalidateQueries({ queryKey: queryKeys.businessHours }),
    invalidateConsultations: () => queryClient.invalidateQueries({ queryKey: queryKeys.consultations }),
    invalidateSettings: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessSettings });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookingSettings });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings });
    },
    invalidateTimeEntries: () => queryClient.invalidateQueries({ queryKey: ['timeEntries'] }),
    invalidateTimeTrackingSettings: () => queryClient.invalidateQueries({ queryKey: queryKeys.timeTrackingSettings }),
    invalidateBilling: () => queryClient.invalidateQueries({ queryKey: queryKeys.billing }),
  };
}
