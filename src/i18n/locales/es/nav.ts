export const nav = {
  // Elementos de navegación (Sidebar / BottomNav)
  calendar: 'Agenda',
  consultations: 'Consultas',
  timeTracking: 'Fichajes',
  clients: 'Clientes',
  staff: 'Estilistas',
  services: 'Servicios',
  finances: 'Finanzas',
  reports: 'Informes',
  billing: 'Facturación',
  settings: 'Ajustes',
  // TopBar
  searchPlaceholder: 'Buscar clientes, reservas...',
  headerDateFormat: "d 'de' MMM yyyy",
  myProfile: 'Mi perfil',
  helpSupport: 'Ayuda y soporte',
  // Página 404
  notFoundTitle: '¡Ups! Página no encontrada',
  backHome: 'Volver al inicio',
  // ErrorBoundary
  errorTitle: 'Algo salió mal',
  errorSectionMessage: 'Ocurrió un error inesperado en esta sección.',
  errorPageMessage: 'Ocurrió un error inesperado. Por favor, recarga la página.',
  reloadPage: 'Recargar página',
  goHome: 'Ir al inicio',
  // Validación de imágenes (componentes compartidos)
  imageInvalidFormat: 'Formato no permitido. Usa JPG, PNG o WebP',
  imageTooLarge: 'La imagen debe ser menor a {size}MB',
} as const;
