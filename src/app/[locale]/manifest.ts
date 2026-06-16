import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { locales, localeConfig, type Locale } from '@/i18n/config';

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function manifest({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<MetadataRoute.Manifest> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'meta' });
    const { dir } = localeConfig[locale as Locale];

    return {
        name: t('site.title'),
        short_name: t('site.name'),
        description: t('site.description'),
        start_url: locale === 'he' ? '/' : `/${locale}`,
        display: 'standalone',
        background_color: '#fef7ed',
        theme_color: '#f97316',
        orientation: 'portrait-primary',
        dir: dir as 'rtl' | 'ltr',
        lang: locale,
        categories: ['education', 'kids'],
        icons: [
            { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
