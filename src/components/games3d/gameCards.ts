import { getTranslations } from 'next-intl/server';
import { getRegisteredGames } from '@/lib/games3d/games';
import type { GameCardData } from './GameCard';

/**
 * Every registered game resolved into localized card data. Server-only (it
 * awaits translations and reads the registry), so client components receive the
 * finished array as a prop instead.
 */
export async function getGameCards(locale: string): Promise<GameCardData[]> {
  const t = await getTranslations({ locale, namespace: 'games3d' });
  return getRegisteredGames().map((g) => {
    const block = t.raw(g.meta.i18nKey.replace('games3d.', '')) as { title?: string } | undefined;
    return {
      id: g.meta.id,
      title: block?.title ?? g.meta.id,
      topic: g.meta.topic,
      topicLabel: t(`topics.${g.meta.topic}`),
      gradeLabel: t('grades', { from: g.meta.gradeRange[0], to: g.meta.gradeRange[1] }),
      difficulty: g.meta.difficulty,
      estimatedSeconds: g.meta.estimatedSeconds,
      grades: g.meta.gradeRange,
    };
  });
}
