import type { LocaleShape } from '../../types';
import type { reports as esReports } from '../es/reports';

export const reports: LocaleShape<typeof esReports> = {
  title: 'Reports',
  subtitle: 'Business performance overview',

  period: {
    week: 'Week',
    month: 'Month',
    quarter: 'Qtr',
    year: 'Year',
  },

  noDataForPeriod: 'No data for this period',

  kpi: {
    revenue: 'Revenue',
    appointments: 'Appointments',
    completedCountOne: '{count} completed',
    completedCountOther: '{count} completed',
    completedTitle: 'Completed',
    noShowCountOne: '{count} no-show',
    noShowCountOther: '{count} no-shows',
    avgPerAppointment: 'Avg/appointment',
    clientsCountOne: '{count} client',
    clientsCountOther: '{count} clients',
  },

  charts: {
    revenueTrend: 'Revenue trend',
    revenueSeries: 'Revenue',
    byService: 'By service',
    appointmentStatus: 'Appointment status',
    busiestHours: 'Busiest hours',
    appointmentsSeries: 'Appointments',
  },

  status: {
    completed: 'Completed',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    noShow: 'No-show',
  },

  payment: {
    title: 'Payment methods',
    cash: 'Cash',
    card: 'Card',
    bizum: 'Bizum',
    unpaid: 'Unpaid',
    appointmentsCountOne: '{count} appointment',
    appointmentsCountOther: '{count} appointments',
    collected: 'Collected',
    paidOfTotal: '({paid} of {total} appointments)',
  },

  topClients: {
    title: 'Top clients',
    visitsOne: '{count} visit',
    visitsOther: '{count} visits',
  },

  staff: {
    performanceByStaff: 'Performance by {staff}',
    noStaffData: 'No data for {staff} this period',
    shareOfTotal: '{share}% of total',
    revenue: 'Revenue',
    appointments: 'Appointments',
    completed: 'Completed',
    noShowCountOne: '{count} no-show',
    noShowCountOther: '{count} no-shows',
    topService: 'Top: {service}',
  },
} as const;
