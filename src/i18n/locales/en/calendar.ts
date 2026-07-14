import type { LocaleShape } from '../../types';
import type { calendar as esCalendar } from '../es/calendar';

export const calendar: LocaleShape<typeof esCalendar> = {
} as const;
