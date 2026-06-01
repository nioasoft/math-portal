import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { getRegisteredGames, gameLoaders, GAME_IDS } from '@/lib/games3d/games';
import type { Locale } from '@/i18n/config';
import type { GameMode3D } from '@/lib/games3d/types';
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
  searchParams,
}: {
  params: Promise<{ locale: string; gameId: string }>;
  searchParams?: Promise<{ mode?: string }>;
}) {
  const { locale, gameId } = await params;
  const meta = findMeta(gameId);
  if (!meta || !gameLoaders[gameId]) notFound();

  const t = await getTranslations({ locale, namespace: meta.i18nKey });

  // Optional `?mode=` deep link: pre-select a mode and skip the picker, but only
  // if it's a valid mode this game actually supports.
  const { mode: rawMode } = (await searchParams) ?? {};
  const initialMode: GameMode3D | undefined =
    (rawMode === 'practice' || rawMode === 'quiz') &&
    meta.supportedModes.includes(rawMode)
      ? rawMode
      : undefined;

  return (
    <Game3DShell
      gameId={gameId}
      meta={meta}
      title={t('title')}
      webGLAvailable={true}
      initialMode={initialMode}
      breadcrumbItems={[
        { label: 'Home', href: '/' },
        { label: 'Games', href: '/play' },
        { label: t('title') },
      ]}
    />
  );
}
