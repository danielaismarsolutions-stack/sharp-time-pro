import type { LocaleShape } from '../../types';
import type { nav as esNav } from '../es/nav';

export const nav: LocaleShape<typeof esNav> = {
  // Navigation items (Sidebar / BottomNav)
  calendar: 'Calendar',
  consultations: 'Consultations',
  timeTracking: 'Time tracking',
  clients: 'Clients',
  staff: 'Stylists',
  services: 'Services',
  finances: 'Finances',
  reports: 'Reports',
  billing: 'Billing',
  settings: 'Settings',
  // TopBar
  searchPlaceholder: 'Search clients, bookings...',
  headerDateFormat: 'd MMM yyyy',
  myProfile: 'My profile',
  helpSupport: 'Help and support',
  // 404 page
  notFoundTitle: 'Oops! Page not found',
  backHome: 'Back to home',
  // ErrorBoundary
  errorTitle: 'Something went wrong',
  errorSectionMessage: 'An unexpected error occurred in this section.',
  errorPageMessage: 'An unexpected error occurred. Please reload the page.',
  reloadPage: 'Reload page',
  goHome: 'Go to home',
  // Image validation (shared components)
  imageInvalidFormat: 'Format not allowed. Use JPG, PNG or WebP',
  imageTooLarge: 'Image must be smaller than {size}MB',
} as const;
