import { locales, defaultLocale, localeConfig, type Locale } from '@/i18n/config';
import type { Metadata } from 'next';

const BASE_URL = 'https://www.tirgul.net';

// Blog/help pages whose locale has no localized file serve English content
// (see FALLBACK_LOCALE in src/lib/content.ts), so their canonical/og must
// point at the English URL — the content actually served — not the Hebrew root.
export const CONTENT_FALLBACK_LOCALE: Locale = 'en';

/**
 * BCP-47 tag for hreflang/lang attributes. Bare "zh" is ambiguous
 * (Simplified vs Traditional); every other locale key is already a valid code.
 */
export function toHreflang(locale: Locale): string {
  return locale === 'zh' ? 'zh-Hans' : locale;
}

/**
 * Generates alternate URLs and hreflang tags for a given path
 * @param path - The current path (with or without locale prefix)
 * @param currentLocale - The current locale
 * @returns Object containing canonical URL and language alternates
 */
export function generateAlternates(
  path: string,
  currentLocale: Locale,
  availableLocales: readonly Locale[] = locales
) {
  // Remove any leading locale prefix to get the clean path. Derived from the
  // locale list (minus the unprefixed default) so adding a locale can't leave
  // this regex behind and emit wrong canonicals/hreflang.
  const prefixed = locales.filter((l) => l !== defaultLocale).join('|');
  const cleanPath = path.replace(new RegExp(`^\\/(${prefixed})`), '') || '/';
  const eligibleLocales = availableLocales.length > 0 ? [...availableLocales] : [defaultLocale];
  const canonicalLocale = eligibleLocales.includes(currentLocale)
    ? currentLocale
    : eligibleLocales.includes(CONTENT_FALLBACK_LOCALE)
      ? CONTENT_FALLBACK_LOCALE
      : eligibleLocales.includes(defaultLocale)
        ? defaultLocale
        : eligibleLocales[0];

  const languages: Record<string, string> = {};

  for (const locale of eligibleLocales) {
    const hreflang = toHreflang(locale);
    if (locale === defaultLocale) {
      // Hebrew stays at root (no prefix)
      languages[hreflang] = `${BASE_URL}${cleanPath}`;
    } else {
      // Other languages use prefix
      languages[hreflang] = `${BASE_URL}/${locale}${cleanPath === '/' ? '' : cleanPath}`;
    }
  }

  // x-default points to the default language (Hebrew)
  languages['x-default'] = getLocalizedUrl(
    cleanPath,
    eligibleLocales.includes(defaultLocale) ? defaultLocale : canonicalLocale
  );

  // Calculate canonical URL for current locale
  const canonical = canonicalLocale === defaultLocale
    ? `${BASE_URL}${cleanPath}`
    : `${BASE_URL}/${canonicalLocale}${cleanPath === '/' ? '' : cleanPath}`;

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

/**
 * Generates OpenGraph metadata for a page
 * @param locale - The current locale
 * @param title - The page title
 * @param description - The page description
 * @param path - The page path (without locale prefix)
 * @returns OpenGraph metadata object
 */
export function generateOpenGraphMeta(
  locale: Locale,
  title: string,
  description: string,
  path: string
): Metadata['openGraph'] {
  const url = getLocalizedUrl(path, locale);
  const ogLocale = localeConfig[locale].locale; // e.g., 'he_IL', 'en_US'

  return {
    title,
    description,
    url,
    siteName: getSiteName(locale),
    locale: ogLocale,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/opengraph-image.jpg`,
        width: 1424,
        height: 752,
        alt: title,
      },
    ],
  };
}

/**
 * Generates Twitter card metadata for a page
 * @param title - The page title
 * @param description - The page description
 * @returns Twitter metadata object
 */
export function generateTwitterMeta(
  title: string,
  description: string
): Metadata['twitter'] {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [`${BASE_URL}/opengraph-image.jpg`],
  };
}

/**
 * Gets the localized site name for a given locale
 * @param locale - The locale
 * @returns The localized site name
 */
export function getSiteName(locale: Locale): string {
  const siteNames: Record<Locale, string> = {
    he: 'תרגול',
    en: 'Tirgul',
    ar: 'Tirgul',
    de: 'Tirgul',
    es: 'Tirgul',
    ru: 'Tirgul',
    zh: 'Tirgul',
  };
  return siteNames[locale];
}

/**
 * Gets the localized organization name for a given locale
 * @param locale - The locale
 * @returns The localized organization name
 */
export function getOrganizationName(locale: Locale): string {
  const orgNames: Record<Locale, string> = {
    he: 'תרגול',
    en: 'Tirgul',
    ar: 'Tirgul',
    de: 'Tirgul',
    es: 'Tirgul',
    ru: 'Tirgul',
    zh: 'Tirgul',
  };
  return orgNames[locale];
}

/**
 * Gets localized educational levels for a given locale
 * @param locale - The locale
 * @returns Array of localized grade level names
 */
export function getEducationalLevels(locale: Locale): string[] {
  const levels: Record<Locale, string[]> = {
    he: ['כיתה א', 'כיתה ב', 'כיתה ג', 'כיתה ד', 'כיתה ה', 'כיתה ו'],
    en: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    ar: ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'],
    de: ['Klasse 1', 'Klasse 2', 'Klasse 3', 'Klasse 4', 'Klasse 5', 'Klasse 6'],
    es: ['Grado 1', 'Grado 2', 'Grado 3', 'Grado 4', 'Grado 5', 'Grado 6'],
    ru: ['1 класс', '2 класс', '3 класс', '4 класс', '5 класс', '6 класс'],
    zh: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  };
  return levels[locale];
}

export { BASE_URL };
