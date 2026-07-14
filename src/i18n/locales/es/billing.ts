export const billing = {
  title: 'Facturación',
  subscriptionActivated: 'Suscripción activada correctamente',
  checkoutCancelled: 'Proceso de pago cancelado',
  loadError: 'Error al cargar los datos de facturación: {message}',
  status: {
    none: 'Sin suscripción',
    active: 'Activa',
    pastDue: 'Pago pendiente',
    canceled: 'Cancelada',
    unpaid: 'Impagada',
    trialing: 'Periodo de prueba',
    incomplete: 'Incompleta',
    incompleteExpired: 'Expirada',
  },
  ambassador: {
    title: 'Plan Embajador',
    badge: 'Embajador',
    description:
      'Tu negocio tiene acceso completo a Nexio como embajador. No se requiere ningún pago.',
  },
  subscriptionStatus: 'Estado de la suscripción',
  monthlyPrice: 'Precio mensual',
  nextCharge: 'Próximo cobro',
  activate: 'Activar suscripción',
  redirecting: 'Redirigiendo...',
  managePayment: 'Gestionar método de pago',
  openingPortal: 'Abriendo...',
  noPriceAssigned:
    'El precio mensual aún no ha sido asignado a tu negocio. Contacta con soporte.',
  paymentHistory: 'Historial de pagos',
  noPayments: 'Aún no hay pagos registrados',
  amount: 'Importe',
  receipt: 'Recibo',
  paymentStatus: {
    paid: 'Pagado',
    failed: 'Fallido',
    open: 'Pendiente',
    void: 'Anulado',
  },
  banner: {
    pastDue: 'Tu suscripción tiene un pago pendiente. Por favor, actualiza tu método de pago.',
    goToBilling: 'Ir a Facturación',
  },
  errors: {
    invalidResponse: '{fn}: respuesta no válida (HTTP {status})',
    http: 'Error HTTP {status}',
  },
} as const;
