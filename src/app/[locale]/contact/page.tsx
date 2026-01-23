import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import ContactFormClient from '@/components/contact/ContactFormClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const title = t('pages.contact.title');
    const description = t('pages.contact.description');

    return {
        title,
        description,
        alternates: generateAlternates('/contact', locale as Locale),
        openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/contact'),
        twitter: generateTwitterMeta(title, description),
    };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": t('breadcrumb.home'),
                "item": "https://www.tirgul.net"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": t('pages.contact.title'),
                "item": `https://www.tirgul.net${locale !== 'he' ? `/${locale}` : ''}/contact`
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbSchema)
                }}
            />
            <ContactFormClient />
        </>
    );
}
