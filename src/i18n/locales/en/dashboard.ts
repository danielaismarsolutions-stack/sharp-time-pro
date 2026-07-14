import type { LocaleShape } from '../../types';
import type { dashboard as esDashboard } from '../es/dashboard';

export const dashboard: LocaleShape<typeof esDashboard> = {
  title: 'Dashboard',
  headerDateShort: 'EEE, d MMM',
  headerDateLong: 'EEEE, d MMMM yyyy',
  newAppointment: 'New appointment',
  loadBookingsError: 'Appointments could not be loaded. Please try again.',
  loadingAppointments: 'Loading appointments...',
  loadErrorTitle: 'Failed to load',
  retrying: 'Retrying...',
  unassigned: 'Unassigned',

  status: {
    confirmed: 'Confirmed',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noShow: 'No-show',
  },

  stats: {
    totalAppointments: 'Total appointments',
    bookingsSub: 'bookings',
    confirmed: 'Confirmed',
    appointmentsSub: 'appointments',
    average: 'Average',
    perAppointmentSub: 'per appointment',
  },

  byStaff: 'By {staff}',

  cardLabels: {
    appointments: 'Appointments',
    revenue: 'Revenue',
    average: 'Average',
  },

  appointments: 'Appointments',
  viewCalendar: 'View calendar',
  searchPlaceholder: 'Search client, service...',
  allStatuses: 'All statuses',
  allStaff: 'All {staff}',
  clearFilters: 'Clear filters',
  clear: 'Clear',
  noAppointmentsFiltered: 'No appointments match these filters',
  noAppointments: 'No appointments recorded',

  table: {
    client: 'Client',
    service: 'Service',
    dateAndTime: 'Date and time',
  },

  paginationRange: '{from}-{to} of {total}',
  perPage: 'Per page:',

  counter: {
    milestoneTitle: '🎉 {prefix}{milestone} reached today!',
    milestoneDescription: 'Congratulations on hitting the milestone!',
    vsYesterday: 'vs yesterday',
    revenueToday: "Today's revenue",
  },
} as const;
