export const reports = {
  title: 'Informes',
  subtitle: 'Resumen del rendimiento del negocio',

  period: {
    week: 'Semana',
    month: 'Mes',
    quarter: 'Trim.',
    year: 'Año',
  },

  noDataForPeriod: 'Sin datos para este periodo',

  kpi: {
    revenue: 'Ingresos',
    appointments: 'Citas',
    completedCountOne: '{count} completada',
    completedCountOther: '{count} completadas',
    completedTitle: 'Completadas',
    noShowCountOne: '{count} no asistió',
    noShowCountOther: '{count} no asistieron',
    avgPerAppointment: 'Prom./Cita',
    clientsCountOne: '{count} cliente',
    clientsCountOther: '{count} clientes',
  },

  charts: {
    revenueTrend: 'Tendencia de Ingresos',
    revenueSeries: 'Ingresos',
    byService: 'Por Servicio',
    appointmentStatus: 'Estado de Citas',
    busiestHours: 'Horas Más Ocupadas',
    appointmentsSeries: 'Citas',
  },

  status: {
    completed: 'Completadas',
    pending: 'Pendientes',
    confirmed: 'Confirmadas',
    cancelled: 'Canceladas',
    noShow: 'No asistió',
  },

  payment: {
    title: 'Metodos de Pago',
    cash: 'Efectivo',
    card: 'Tarjeta',
    bizum: 'Bizum',
    unpaid: 'Sin cobrar',
    appointmentsCountOne: '{count} cita',
    appointmentsCountOther: '{count} citas',
    collected: 'Cobrado',
    paidOfTotal: '({paid} de {total} citas)',
  },

  topClients: {
    title: 'Mejores Clientes',
    visitsOne: '{count} visita',
    visitsOther: '{count} visitas',
  },

  staff: {
    performanceByStaff: 'Rendimiento por {staff}',
    noStaffData: 'Sin datos de {staff} para este periodo',
    shareOfTotal: '{share}% del total',
    revenue: 'Ingresos',
    appointments: 'Citas',
    completed: 'Completadas',
    noShowCountOne: '{count} no asistió',
    noShowCountOther: '{count} no asistieron',
    topService: 'Top: {service}',
  },
} as const;
