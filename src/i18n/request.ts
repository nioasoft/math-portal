import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Load all message files and merge them
  const common = (await import(`../../messages/${locale}/common.json`)).default;
  const home = (await import(`../../messages/${locale}/home.json`)).default;
  const math = (await import(`../../messages/${locale}/math.json`)).default;
  const curriculum = (await import(`../../messages/${locale}/curriculum.json`)).default;
  const worksheet = (await import(`../../messages/${locale}/worksheet.json`)).default;
  const games = (await import(`../../messages/${locale}/games.json`)).default;
  const meta = (await import(`../../messages/${locale}/meta.json`)).default;

  return {
    locale,
    messages: {
      common,
      home,
      math,
      curriculum,
      worksheet,
      games,
      meta,
    },
  };
});
