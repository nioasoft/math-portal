import { notFound } from 'next/navigation';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { canaryGame } from './CanaryGame';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CanaryPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'games3d.canary' });
  return (
    <Game3DShell
      game={canaryGame}
      title={t('title')}
      webGLAvailable={true}
      breadcrumbItems={[
        { label: 'Home', href: '/' },
        { label: 'Games', href: '/play' },
        { label: t('title') },
      ]}
    />
  );
}
