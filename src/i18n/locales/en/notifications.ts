import type { LocaleShape } from '../../types';
import type { notifications as esNotifications } from '../es/notifications';

export const notifications: LocaleShape<typeof esNotifications> = {
  title: 'Notifications',
  markAllRead: 'Mark all as read',
  empty: 'No notifications',
  loadError: 'Failed to load notifications',
} as const;
