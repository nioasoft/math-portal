import { locales, defaultLocale, type Locale } from '@/i18n/config';

const BASE_URL = 'https://www.tirgul.net';

/**
 * Generates alternate URLs and hreflang tags for a given path
 * @param path - The current path (with or without locale prefix)
 * @param currentLocale - The current locale
 * @returns Object containing canonical URL and language alternates
 */
export function generateAlternates(path: string, currentLocale: Locale) {
  // Remove any leading locale prefix to get the clean path
  const cleanPath = path.replace(/^\/(en|ar|de|es)/, '') || '/';

  const languages: Record<string, string> = {};

  for (const locale of locales) {
    if (locale === defaultLocale) {
      // Hebrew stays at root (no prefix)
      languages[locale] = `${BASE_URL}${cleanPath}`;
    } else {
      // Other languages use prefix
      languages[locale] = `${BASE_URL}/${locale}${cleanPath === '/' ? '' : cleanPath}`;
    }
  }

  // x-default points to the default language (Hebrew)
  languages['x-default'] = `${BASE_URL}${cleanPath}`;

  // Calculate canonical URL for current locale
  const canonical = currentLocale === defaultLocale
    ? `${BASE_URL}${cleanPath}`
    : `${BASE_URL}/${currentLocale}${cleanPath === '/' ? '' : cleanPath}`;

  return {
    canonical,
    languages,
  };
}

/**
 * Generates hreflang link elements for SSR
 * @param path - The current path
 * @param currentLocale - The current locale
 * @returns Array of hreflang link element attributes
 */
export function generateHreflangLinks(path: string, currentLocale: Locale): Array<{
  rel: 'alternate';
  hrefLang: string;
  href: string;
}> {
  const { languages } = generateAlternates(path, currentLocale);

  return Object.entries(languages).map(([lang, href]) => ({
    rel: 'alternate' as const,
    hrefLang: lang,
    href,
  }));
}

/**
 * Gets the full URL for a given path and locale
 * @param path - The path (without locale prefix)
 * @param locale - The target locale
 * @returns The full URL
 */
export function getLocalizedUrl(path: string, locale: Locale): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (locale === defaultLocale) {
    return `${BASE_URL}${cleanPath}`;
  }

  return `${BASE_URL}/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

export { BASE_URL };
