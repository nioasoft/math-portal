import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { GameSeoContent } from '@/components/games3d/GameSeoContent';
import { getRegisteredGames } from '@/lib/games3d/games';
import { gameLoaders, GAME_IDS } from '@/lib/games3d/games/loaders';
import type { Locale } from '@/i18n/config';
import type { GameMode3D } from '@/lib/games3d/types';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';
import { buildGameBreadcrumbJsonLd, buildGameFaqJsonLd, buildGameJsonLd } from '@/lib/games3d/seo';
import { isCompleteGameSeo, type GameSeo } from '@/lib/games3d/gameSeo';

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
  const games3dT = await getTranslations({ locale, namespace: 'games3d' });
  const title = t('title');
  const description = t('description');

  const seoRaw = (() => {
    try { return t.raw('seo'); } catch { return undefined; }
  })();
  const hasSeo = isCompleteGameSeo(seoRaw);

  return {
    title,
    description,
    keywords: [title, description, games3dT(`topics.${meta.topic}`)],
    alternates: generateAlternates(`/play/${gameId}`, locale as Locale),
    openGraph: generateOpenGraphMeta(locale as Locale, title, description, `/play/${gameId}`),
    twitter: generateTwitterMeta(title, description),
    robots: hasSeo ? undefined : { index: false, follow: true },
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
  const metaT = await getTranslations({ locale, namespace: 'meta' });
  const games3dT = await getTranslations({ locale, namespace: 'games3d' });
  const title = t('title');
  const instructions = t('instructions');
  const topicLabel = games3dT(`topics.${meta.topic}`);
  const relatedGames = getRegisteredGames()
    .filter((g) => g.meta.id !== gameId && g.meta.topic === meta.topic)
    .slice(0, 4)
    .map((g) => {
      const suffix = g.meta.i18nKey.replace('games3d.', '');
      const block = games3dT.raw(suffix) as { title?: string } | undefined;
      return { id: g.meta.id, title: block?.title ?? g.meta.id };
    });

  const seoRaw = (() => {
    try { return t.raw('seo'); } catch { return undefined; }
  })();
  const gameSeo: GameSeo | null = isCompleteGameSeo(seoRaw) ? seoRaw : null;

  const learningResourceJsonLd = buildGameJsonLd({
    locale: locale as Locale,
    gameId,
    meta,
    title,
    description: t('description'),
    topicLabel,
  });
  const faqJsonLd = gameSeo ? buildGameFaqJsonLd({ faqs: gameSeo.faqs }) : null;
  const breadcrumbJsonLd = buildGameBreadcrumbJsonLd({
    locale: locale as Locale,
    title,
    gameId,
    homeName: metaT('breadcrumb.home'),
    playName: metaT('breadcrumb.play'),
  });

  // Optional `?mode=` deep link: pre-select a mode and skip the picker, but only
  // if it's a valid mode this game actually supports.
  const { mode: rawMode } = (await searchParams) ?? {};
  const initialMode: GameMode3D | undefined =
    (rawMode === 'practice' || rawMode === 'quiz') &&
    meta.supportedModes.includes(rawMode)
      ? rawMode
      : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learningResourceJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Game3DShell
        gameId={gameId}
        meta={meta}
        title={title}
        instructions={instructions}
        webGLAvailable={true}
        initialMode={initialMode}
        breadcrumbItems={[
          { label: metaT('breadcrumb.home'), href: '/' },
          { label: metaT('pages.play.title'), href: '/play' },
          { label: title },
        ]}
      />
      {gameSeo && (
        <GameSeoContent
          locale={locale}
          meta={meta}
          title={title}
          topicLabel={topicLabel}
          relatedGames={relatedGames}
          seo={gameSeo}
        />
      )}
    </>
  );
}
