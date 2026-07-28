export const dashboard = {
  title: 'Panel de Control',
  headerDateShort: 'EEE, d MMM',
  headerDateLong: "EEEE, d 'de' MMMM 'de' yyyy",
  newAppointment: 'Nueva Cita',
  loadBookingsError: 'No se pudieron cargar las citas. Por favor, intente de nuevo.',
  loadingAppointments: 'Cargando citas...',
  loadErrorTitle: 'Error al cargar',
  retrying: 'Reintentando...',
  unassigned: 'Sin asignar',

  status: {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    completed: 'Completada',
    cancelled: 'Cancelada',
    noShow: 'No asistió',
  },

  stats: {
    totalAppointments: 'Total Citas',
    bookingsSub: 'reservas',
    confirmed: 'Confirmadas',
    appointmentsSub: 'citas',
    average: 'Promedio',
    perAppointmentSub: 'por cita',
  },

  byStaff: 'Por {staff}',

  cardLabels: {
    appointments: 'Citas',
    revenue: 'Ingresos',
    average: 'Promedio',
  },

  appointments: 'Citas',
  viewCalendar: 'Ver Agenda',
  searchPlaceholder: 'Buscar cliente, servicio...',
  allStatuses: 'Todos los estados',
  allStaff: 'Todos los {staff}',
  clearFilters: 'Limpiar filtros',
  clear: 'Limpiar',
  noAppointmentsFiltered: 'No hay citas con estos filtros',
  noAppointments: 'No hay citas registradas',

  table: {
    client: 'Cliente',
    service: 'Servicio',
    dateAndTime: 'Fecha y Hora',
  },

  paginationRange: '{from}-{to} de {total}',
  perPage: 'Por página:',

  counter: {
    milestoneTitle: '🎉 ¡{milestone}{prefix} alcanzados hoy!',
    milestoneDescription: '¡Felicidades por el logro!',
    vsYesterday: 'vs ayer',
    revenueToday: 'Ingresos hoy',
  },
} as const;
