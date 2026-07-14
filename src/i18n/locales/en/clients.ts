import type { LocaleShape } from '../../types';
import type { clients as esClients } from '../es/clients';

export const clients: LocaleShape<typeof esClients> = {
} as const;
