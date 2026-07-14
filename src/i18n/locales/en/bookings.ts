import type { LocaleShape } from '../../types';
import type { bookings as esBookings } from '../es/bookings';

export const bookings: LocaleShape<typeof esBookings> = {
} as const;
