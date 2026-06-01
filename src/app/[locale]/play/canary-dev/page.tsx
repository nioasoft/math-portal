import { notFound } from 'next/navigation';
import { CanaryShell } from './CanaryShell';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CanaryPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'games3d.canary' });
  return (
    <CanaryShell
      title={t('title')}
      breadcrumbItems={[
        { label: 'Home', href: '/' },
        { label: 'Games', href: '/play' },
        { label: t('title') },
      ]}
    />
  );
}
