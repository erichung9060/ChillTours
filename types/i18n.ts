import type { Locale } from '@/lib/i18n/config';

export interface LocaleRouteParams {
  locale: Locale;
  [key: string]: string;
}

export type { Locale };
