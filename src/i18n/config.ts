export const locales = ['he', 'en', 'ar', 'de', 'es', 'ru', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'he';
export const rtlLocales: Locale[] = ['he', 'ar'];

export const localeConfig = {
  he: { dir: 'rtl' as const, name: 'עברית', locale: 'he_IL' },
  en: { dir: 'ltr' as const, name: 'English', locale: 'en_US' },
  ar: { dir: 'rtl' as const, name: 'العربية', locale: 'ar_SA' },
  de: { dir: 'ltr' as const, name: 'Deutsch', locale: 'de_DE' },
  es: { dir: 'ltr' as const, name: 'Español', locale: 'es_ES' },
  ru: { dir: 'ltr' as const, name: 'Русский', locale: 'ru_RU' },
  zh: { dir: 'ltr' as const, name: '中文', locale: 'zh_CN' },
} as const;

/** Takes a `string` because `useLocale()` is untyped without an AppConfig augmentation. */
export function isRtlLocale(locale: string): boolean {
  return (rtlLocales as string[]).includes(locale);
}

/**
 * Per-script typography that JSX cannot infer. `gap` joins two adjacent
 * `{t(...)}` fragments — JSX strips the newline between them, so the separator
 * has to be explicit, and CJK writes no inter-word space. `stop` is the
 * sentence-final full stop. A `Record<Locale, …>` so a new locale fails `tsc`
 * until the choice is made deliberately.
 */
export const scriptTypography: Record<Locale, { gap: string; stop: string }> = {
  he: { gap: ' ', stop: '.' },
  en: { gap: ' ', stop: '.' },
  ar: { gap: ' ', stop: '.' },
  de: { gap: ' ', stop: '.' },
  es: { gap: ' ', stop: '.' },
  ru: { gap: ' ', stop: '.' },
  zh: { gap: '', stop: '。' },
};
