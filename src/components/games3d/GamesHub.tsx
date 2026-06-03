import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Gamepad2, ArrowLeft, Sparkles } from 'lucide-react';
import { getRegisteredGames } from '@/lib/games3d/games';
import { TopicShelf } from './TopicShelf';
import { TOPIC_ORDER } from './topicMeta';
import type { GameCardData } from './GameCard';

/**
 * Home-page "Games Hub": a prominent banner + one Netflix-style shelf per topic,
 * fed live from getRegisteredGames() so it auto-updates as games are added.
 * Server component (the registry is server-only). RTL-safe throughout.
 */
export async function GamesHub() {
  const games = getRegisteredGames();
  const tHome = await getTranslations('home');
  const tGames = await getTranslations('games3d');

  // Group games by topic and resolve their localized card data.
  const byTopic = new Map<string, GameCardData[]>();
  for (const g of games) {
    const suffix = g.meta.i18nKey.replace('games3d.', '');
    const block = tGames.raw(suffix) as { title?: string } | undefined;
    const card: GameCardData = {
      id: g.meta.id,
      title: block?.title ?? g.meta.id,
      topic: g.meta.topic,
      topicLabel: tGames(`topics.${g.meta.topic}`),
      gradeLabel: tGames('grades', { from: g.meta.gradeRange[0], to: g.meta.gradeRange[1] }),
    };
    const list = byTopic.get(g.meta.topic) ?? [];
    list.push(card);
    byTopic.set(g.meta.topic, list);
  }

  // Order shelves: known topics first (TOPIC_ORDER), then any unexpected ones.
  const orderedTopics = [
    ...TOPIC_ORDER.filter((t) => byTopic.has(t)),
    ...[...byTopic.keys()].filter((t) => !TOPIC_ORDER.includes(t)),
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 py-12 md:py-16">
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="absolute -top-24 end-[-6rem] h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="absolute -bottom-24 start-[-6rem] h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="container-custom relative z-10">
        {/* Banner */}
        <div className="mb-10 rounded-3xl border border-purple-200/70 bg-white/70 p-6 text-center shadow-lg backdrop-blur-sm md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700">
            <Sparkles size={16} />
            {tHome('gamesHub.badge')}
          </div>
          <h2 className="mb-3 text-2xl font-black text-slate-800 md:text-4xl text-display">
            {tHome('gamesHub.title', { count: games.length })}
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-base text-slate-600 md:text-lg">
            {tHome('gamesHub.subtitle')}
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/play"
              className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-purple-200/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <Gamepad2 size={22} />
              {tHome('gamesHub.cta')}
              <ArrowLeft size={20} className="ltr:-scale-x-100" />
            </Link>
            <span className="text-xs font-medium text-slate-500">{tHome('gamesHub.trust')}</span>
          </div>
        </div>

        {/* Topic shelves */}
        {orderedTopics.length > 0 ? (
          orderedTopics.map((topic) => (
            <TopicShelf
              key={topic}
              topic={topic}
              topicLabel={tGames(`topics.${topic}`)}
              games={byTopic.get(topic) ?? []}
              showAllLabel={tHome('gamesHub.showAll')}
            />
          ))
        ) : (
          /* Empty state — should never happen while the registry has games, but Iron Law 7. */
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white/60 p-10 text-center">
            <p className="mb-4 text-slate-600">{tHome('gamesHub.empty')}</p>
            <Link href="/play" className="font-bold text-purple-600 hover:text-purple-700">
              {tHome('gamesHub.cta')}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
