import type { LocaleShape } from '../../types';
import type { billing as esBilling } from '../es/billing';

export const billing: LocaleShape<typeof esBilling> = {
} as const;
