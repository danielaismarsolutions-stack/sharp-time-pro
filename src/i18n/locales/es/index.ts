import { common } from './common';
import { nav } from './nav';
import { auth } from './auth';
import { notifications } from './notifications';
import { calendar } from './calendar';
import { bookings } from './bookings';
import { consultations } from './consultations';
import { clients } from './clients';
import { barbers } from './barbers';
import { services } from './services';
import { dashboard } from './dashboard';
import { reports } from './reports';
import { settings } from './settings';
import { timeTracking } from './timeTracking';
import { billing } from './billing';
import { legal } from './legal';

export const es = {
  common,
  nav,
  auth,
  notifications,
  calendar,
  bookings,
  consultations,
  clients,
  barbers,
  services,
  dashboard,
  reports,
  settings,
  timeTracking,
  billing,
  legal,
} as const;
