export const locales = ['he', 'en', 'ar', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'he';
export const rtlLocales: Locale[] = ['he', 'ar'];

export const localeConfig = {
  he: { dir: 'rtl' as const, name: 'עברית', locale: 'he_IL' },
  en: { dir: 'ltr' as const, name: 'English', locale: 'en_US' },
  ar: { dir: 'rtl' as const, name: 'العربية', locale: 'ar_SA' },
  de: { dir: 'ltr' as const, name: 'Deutsch', locale: 'de_DE' },
  es: { dir: 'ltr' as const, name: 'Español', locale: 'es_ES' },
} as const;

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
