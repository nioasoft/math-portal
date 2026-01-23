import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  const title = t('pages.blog.title');
  const description = t('pages.blog.description');

  return {
    title,
    description,
    alternates: generateAlternates('/blog', locale as Locale),
    openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/blog'),
    twitter: generateTwitterMeta(title, description),
  };
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
