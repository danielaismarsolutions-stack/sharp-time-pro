import type { LocaleShape } from '../../types';
import type { timeTracking as esTimeTracking } from '../es/timeTracking';

export const timeTracking: LocaleShape<typeof esTimeTracking> = {
} as const;
