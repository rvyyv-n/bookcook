import { useSettings } from '../db/hooks';
import { en, type Locale } from './en';

export const LOCALES: Record<string, Locale> = { en };

export function getLocale(lang: string | undefined): Locale {
  return (lang && LOCALES[lang]) || en;
}

/** Strings for the current language. */
export function useT(): Locale {
  const { lang } = useSettings();
  return getLocale(lang);
}

export type { Locale };
