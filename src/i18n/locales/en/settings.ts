import type { LocaleShape } from '../../types';
import type { settings as esSettings } from '../es/settings';

export const settings: LocaleShape<typeof esSettings> = {
  language: {
    title: 'Language',
    description:
      'Choose the app language. It applies to the whole business: interface, notifications and client emails.',
    spanish: 'Español',
    spanishDescription: 'Interface and communications in Spanish',
    english: 'English',
    englishDescription: 'Interface and communications in English',
    adminOnly: 'Only an administrator can change the business language.',
    changed: 'Language updated',
    changedDescription: 'The language has been saved for the whole business.',
    changeError: 'The language could not be saved. Please try again.',
  },
} as const;
