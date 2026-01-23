import { locales, defaultLocale, localeConfig, type Locale } from '@/i18n/config';
import type { Metadata } from 'next';

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
    siteName: localeConfig[locale].name === 'עברית' ? 'תרגול' :
              localeConfig[locale].name === 'English' ? 'Smart Worksheets' :
              localeConfig[locale].name === 'العربية' ? 'أوراق عمل ذكية' :
              localeConfig[locale].name === 'Deutsch' ? 'Clevere Arbeitsblätter' :
              'Hojas de Trabajo Inteligentes',
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
    en: 'Smart Worksheets',
    ar: 'أوراق عمل ذكية',
    de: 'Clevere Arbeitsblätter',
    es: 'Hojas de Trabajo Inteligentes',
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
    he: 'דפי עבודה חכמים',
    en: 'Smart Worksheets',
    ar: 'أوراق عمل ذكية',
    de: 'Clevere Arbeitsblätter',
    es: 'Hojas de Trabajo Inteligentes',
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
  };
  return levels[locale];
}

export { BASE_URL };
