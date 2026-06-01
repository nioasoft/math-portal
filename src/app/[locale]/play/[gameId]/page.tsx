import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { getRegisteredGames, gameLoaders, GAME_IDS } from '@/lib/games3d/games';
import type { Locale } from '@/i18n/config';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';

export function generateStaticParams(): Array<{ gameId: string }> {
  return GAME_IDS.map((gameId) => ({ gameId }));
}

function findMeta(gameId: string) {
  return getRegisteredGames().find((g) => g.meta.id === gameId)?.meta ?? null;
}

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string; gameId: string }> }): Promise<Metadata> {
  const { locale, gameId } = await params;
  const meta = findMeta(gameId);
  if (!meta) return {};
  const t = await getTranslations({ locale, namespace: meta.i18nKey });
  const title = t('title');
  const description = t('description');
  return {
    title,
    description,
    alternates: generateAlternates(`/play/${gameId}`, locale as Locale),
    openGraph: generateOpenGraphMeta(locale as Locale, title, description, `/play/${gameId}`),
    twitter: generateTwitterMeta(title, description),
  };
}

export default async function GamePage({
  params,
}: { params: Promise<{ locale: string; gameId: string }> }) {
  const { locale, gameId } = await params;
  const meta = findMeta(gameId);
  if (!meta || !gameLoaders[gameId]) notFound();

  const loaded = await gameLoaders[gameId]();
  const game = loaded.default;
  const t = await getTranslations({ locale, namespace: meta.i18nKey });

  return (
    <Game3DShell
      game={game}
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
