import type { LocaleShape } from '../../types';
import type { auth as esAuth } from '../es/auth';

export const auth: LocaleShape<typeof esAuth> = {
} as const;
