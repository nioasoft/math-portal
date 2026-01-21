import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import ContactFormClient from '@/components/contact/ContactFormClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    return {
        title: t('pages.contact.title'),
        description: t('pages.contact.description'),
        alternates: generateAlternates('/contact', locale as Locale),
    };
}

export default function ContactPage() {
    return <ContactFormClient />;
}
