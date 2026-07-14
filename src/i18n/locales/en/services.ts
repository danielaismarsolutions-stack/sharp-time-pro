import type { LocaleShape } from '../../types';
import type { services as esServices } from '../es/services';

export const services: LocaleShape<typeof esServices> = {
} as const;
