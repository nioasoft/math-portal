import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { GameCard } from './GameCard';
import { getGameCards } from './gameCards';

/** A short introduction; the full searchable collection stays in the games catalog. */
export async function GamesHub() {
  const t = await getTranslations('home');
  const cards = await getGameCards(await getLocale());
  const starterIds = ['ten-frame-fill', 'fraction-slice', 'shape-sort-3d'];
  const featured = starterIds.flatMap(id => {
    const game = cards.find(card => card.id === id);
    return game ? [game] : [];
  });

  return (
    <section className="bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 py-10 md:py-14">
      <div className="container-custom">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold text-purple-700">{t('gamesHub.badge')}</p>
            <h2 className="mb-2 text-2xl font-black text-slate-800 md:text-3xl">{t('gamesHub.title', { count: cards.length })}</h2>
            <p className="max-w-2xl text-slate-600">{t('gamesHub.subtitle')}</p>
          </div>
          <Link href="/play" data-discovery-source="home" data-discovery-target="all-games"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-purple-700 px-5 py-3 font-bold text-white hover:bg-purple-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">
            <Gamepad2 size={20} aria-hidden="true" />{t('gamesHub.cta')}
            <ArrowLeft size={18} className="ltr:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
        {featured.length ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map(game => <GameCard key={game.id} game={game} fixedWidth={false} />)}
          </div>
        ) : <p className="rounded-xl border border-purple-200 bg-white p-6 text-slate-600">{t('gamesHub.empty')}</p>}
      </div>
    </section>
  );
}
