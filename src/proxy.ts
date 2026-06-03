import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: true,
});

export function proxy(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for:
  // - /api routes
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - Static files (with extensions)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
